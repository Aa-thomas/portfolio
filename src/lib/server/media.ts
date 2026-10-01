import sharp from 'sharp';
import { mkdirSync, writeFileSync, readFileSync, unlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { db, MEDIA_DIR, newId, now } from './db';

/**
 * Private media boundary (D-04 proposal). A photo is an owner-uploaded file
 * treated as untrusted data: it is decoded, validated by content (not by
 * filename), auto-oriented, and reduced to 3:2 thumbnails with metadata
 * stripped. The original bytes are preserved privately. The source is never
 * enlarged, and derivatives always come from the stored crop so preview and
 * published output agree (SC-03).
 */

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MiB
export const MAX_PIXELS = 40_000_000; // 40 MP decoded
const ALLOWED = new Set(['jpeg', 'png', 'webp']);
const CARD_ASPECT = 3 / 2;

export class MediaError extends Error {
	constructor(
		message: string,
		readonly code: string
	) {
		super(message);
	}
}

export type CropRect = { x: number; y: number; w: number; h: number };

export type StoredPhoto = {
	id: string;
	role: 'photo' | 'cover' | 'image';
	width: number;
	height: number;
};

/** Largest 3:2 rect that fits inside the image, centered (default framing). */
export function defaultCrop(width: number, height: number): CropRect {
	if (width / height >= CARD_ASPECT) {
		const h = height;
		const w = height * CARD_ASPECT;
		return { x: (width - w) / 2 / width, y: 0, w: w / width, h: 1 };
	}
	const w = width;
	const h = width / CARD_ASPECT;
	return { x: 0, y: (height - h) / 2 / height, w: 1, h: h / height };
}

export function normalizeCrop(raw: unknown, width: number, height: number): CropRect {
	const fallback = defaultCrop(width, height);
	if (!raw) return fallback;
	let rect: CropRect;
	if (typeof raw === 'string') {
		try {
			rect = JSON.parse(raw);
		} catch {
			return fallback;
		}
	} else if (typeof raw === 'object' && raw !== null) {
		rect = raw as CropRect;
	} else {
		return fallback;
	}
	const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
	const x = num(rect.x);
	const y = num(rect.y);
	const w = num(rect.w);
	const h = num(rect.h);
	if (x === null || y === null || w === null || h === null) return fallback;
	// Clamp into the image, keep the 3:2 window, re-center when out of range.
	let cw = Math.min(Math.max(w, 0.01), 1);
	let ch = Math.min(Math.max(h, 0.01), 1);
	const aspect = cw / ch;
	if (Math.abs(aspect - CARD_ASPECT) > 0.35) {
		return fallback;
	}
	if (aspect > CARD_ASPECT) cw = ch * CARD_ASPECT;
	else ch = cw / CARD_ASPECT;
	const cx = Math.min(Math.max(x + w / 2, cw / 2), 1 - cw / 2);
	const cy = Math.min(Math.max(y + h / 2, ch / 2), 1 - ch / 2);
	return { x: cx - cw / 2, y: cy - ch / 2, w: cw, h: ch };
}

async function inspectUpload(bytes: Buffer) {
	if (bytes.length === 0) throw new MediaError('The selected file is empty.', 'empty');
	if (bytes.length > MAX_UPLOAD_BYTES) {
		throw new MediaError('That file is larger than the 10 MiB upload limit.', 'too-large');
	}
	let meta;
	try {
		meta = await sharp(bytes, { limitInputPixels: MAX_PIXELS }).metadata();
	} catch {
		throw new MediaError('That file could not be read as an image.', 'corrupt');
	}
	if (!meta.format || !ALLOWED.has(meta.format)) {
		throw new MediaError(
			'Unsupported image type. JPEG, PNG and WebP stills are accepted.',
			'type'
		);
	}
	if ((meta.pages ?? 1) > 1) {
		throw new MediaError('Animated images are not supported in the first release.', 'animated');
	}
	const width = meta.width ?? 0;
	const height = meta.height ?? 0;
	if (!width || !height || width * height > MAX_PIXELS) {
		throw new MediaError('That image is too large to process.', 'too-large');
	}
	// EXIF orientation 5-8 swaps width/height after auto-rotation.
	const rotated = (meta.orientation ?? 1) >= 5;
	return {
		format: meta.format,
		width: rotated ? height : width,
		height: rotated ? width : height
	};
}

async function renderCard(photoId: string, sourcePath: string, crop: CropRect): Promise<void> {
	const meta = await sharp(sourcePath).metadata();
	const rotated = (meta.orientation ?? 1) >= 5;
	const ow = rotated ? (meta.height ?? 1) : (meta.width ?? 1);
	const oh = rotated ? (meta.width ?? 1) : (meta.height ?? 1);
	const left = Math.round(crop.x * ow);
	const top = Math.round(crop.y * oh);
	const width = Math.max(16, Math.round(crop.w * ow));
	const height = Math.max(16, Math.round(crop.h * oh));
	const dir = join(MEDIA_DIR, photoId);
	const extract = { left, top, width, height };
	await sharp(sourcePath)
		.rotate()
		.extract(extract)
		.resize({ width: 800, withoutEnlargement: true })
		.jpeg({ quality: 82 })
		.toFile(join(dir, 'card.jpg'));
	await sharp(sourcePath)
		.rotate()
		.extract(extract)
		.resize({ width: 1600, withoutEnlargement: true })
		.jpeg({ quality: 80 })
		.toFile(join(dir, 'card2x.jpg'));
}

export async function storePhoto(
	entryId: string,
	role: 'photo' | 'cover' | 'image',
	bytes: Buffer,
	cropInput?: unknown
): Promise<StoredPhoto> {
	const info = await inspectUpload(bytes);
	const photoId = newId('img');
	const dir = join(MEDIA_DIR, photoId);
	mkdirSync(dir, { recursive: true });
	const sourcePath = join(dir, 'source.bin');
	writeFileSync(sourcePath, bytes);
	const crop = normalizeCrop(cropInput, info.width, info.height);
	if (role === 'image') {
		// Body images keep their natural aspect; oriented, downscaled, no metadata.
		await sharp(sourcePath)
			.rotate()
			.resize({ width: 1600, withoutEnlargement: true })
			.jpeg({ quality: 84 })
			.toFile(join(dir, 'full.jpg'));
	} else {
		try {
			await renderCard(photoId, sourcePath, crop);
		} catch (err) {
			db.prepare('DELETE FROM photos WHERE id = ?').run(photoId);
			throw new MediaError(
				'The image could not be processed. The previous saved photo is unchanged.',
				'processing'
			);
		}
	}
	db.prepare(
		`INSERT INTO photos (id, entry_id, role, mime, width, height, bytes, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
	).run(photoId, entryId, role, `image/${info.format}`, info.width, info.height, bytes.length, now());
	return { id: photoId, role, width: info.width, height: info.height };
}

/** Re-derive thumbnails for an existing photo after a crop change. */
export async function reframePhoto(photoId: string, cropInput: unknown): Promise<CropRect> {
	const row = db.prepare('SELECT * FROM photos WHERE id = ?').get(photoId) as
		| { id: string; width: number; height: number }
		| undefined;
	if (!row) throw new MediaError('The saved photo is missing.', 'missing');
	const crop = normalizeCrop(cropInput, row.width, row.height);
	const sourcePath = join(MEDIA_DIR, photoId, 'source.bin');
	await renderCard(photoId, sourcePath, crop);
	return crop;
}

export async function replaceEntryPhoto(
	entryId: string,
	role: 'photo' | 'cover',
	currentPhotoId: string | null,
	bytes: Buffer | undefined,
	cropInput: unknown
): Promise<{ photoId: string | null; crop: string | null }> {
	if (!bytes || bytes.length === 0) {
		// No new upload: keep the saved photo, but honour a crop change.
		if (currentPhotoId) {
			const crop = await reframePhoto(currentPhotoId, cropInput);
			return { photoId: currentPhotoId, crop: JSON.stringify(crop) };
		}
		return { photoId: null, crop: null };
	}
	const stored = await storePhoto(entryId, role, bytes, cropInput);
	const prior = currentPhotoId
		? (db.prepare('SELECT id FROM photos WHERE id = ?').get(currentPhotoId) as
				| { id: string }
				| undefined)
		: undefined;
	const crop = normalizeCrop(cropInput, stored.width, stored.height);
	// Only after the new photo is fully stored and derived do we stop
	// referencing the old one; a failure above left the old data intact (SC-05).
	return { photoId: stored.id, crop: JSON.stringify(crop), ...(prior ? {} : {}) };
}

export type MediaFile =
	| { kind: 'card'; bytes: Buffer; mime: 'image/jpeg' }
	| { kind: 'source'; bytes: Buffer; mime: string };

export function readMediaFile(photoId: string, variant: string): MediaFile | null {
	const safeId = photoId.replace(/[^a-z0-9_-]/gi, '');
	if (safeId !== photoId) return null;
	const row = db.prepare('SELECT mime FROM photos WHERE id = ?').get(photoId) as
		| { mime: string }
		| undefined;
	if (!row) return null;
	const dir = resolve(MEDIA_DIR, safeId);
	try {
		if (variant === 'card') {
			return { kind: 'card', bytes: readFileSync(join(dir, 'card.jpg')), mime: 'image/jpeg' };
		}
		if (variant === 'card2x') {
			return { kind: 'card', bytes: readFileSync(join(dir, 'card2x.jpg')), mime: 'image/jpeg' };
		}
		if (variant === 'full') {
			return { kind: 'card', bytes: readFileSync(join(dir, 'full.jpg')), mime: 'image/jpeg' };
		}
		if (variant === 'source') {
			return { kind: 'source', bytes: readFileSync(join(dir, 'source.bin')), mime: row.mime };
		}
	} catch {
		return null;
	}
	return null;
}

export function photoIsPublic(photoId: string): boolean {
	const row = db
		.prepare('SELECT 1 FROM published_media WHERE photo_id = ? LIMIT 1')
		.get(photoId);
	return row !== undefined;
}

/** Record which photos a published snapshot exposes; clears them on withdraw. */
export function setPublishedMedia(entryId: string, photoIds: string[]): void {
	db.prepare('DELETE FROM published_media WHERE entry_id = ?').run(entryId);
	const insert = db.prepare(
		'INSERT OR IGNORE INTO published_media (photo_id, entry_id) VALUES (?, ?)'
	);
	for (const id of photoIds) insert.run(id, entryId);
}

export function photoUrl(id: string, variant: 'card' | 'card2x' | 'source' = 'card'): string {
	return `/media/${id}/${variant}`;
}
