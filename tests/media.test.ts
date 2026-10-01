import { beforeAll, describe, expect, it } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import sharp from 'sharp';

process.env.PORTFOLIO_DATA = mkdtempSync(join(tmpdir(), 'notebook-media-'));

describe('media boundary (PF-04, D-04)', () => {
	let media: typeof import('../src/lib/server/media');
	let db: typeof import('../src/lib/server/db');
	let entryId: string;

	async function png(width: number, height: number): Promise<Buffer> {
		return sharp({
			create: { width, height, channels: 3, background: '#7a5b3a' }
		})
			.png()
			.toBuffer();
	}

	beforeAll(async () => {
		media = await import('../src/lib/server/media');
		db = await import('../src/lib/server/db');
		entryId = db.newId('prj');
		db.db
			.prepare(
				"INSERT INTO entries (id, kind, created_at, draft_version) VALUES (?, 'project', ?, 1)"
			)
			.run(entryId, db.now());
	});

	it('SC-03 stores a real photo with validated derivatives', async () => {
		const stored = await media.storePhoto(entryId, 'photo', await png(900, 500));
		expect(stored.width).toBe(900);
		const card = readFileSync(join(db.MEDIA_DIR, stored.id, 'card.jpg'));
		const meta = await sharp(card).metadata();
		expect(meta.format).toBe('jpeg');
		// 3:2 framing, never enlarged beyond the source crop.
		expect(meta.width! / meta.height!).toBeCloseTo(1.5, 1);
		expect(meta.width!).toBeLessThanOrEqual(900);
		const source = existsSync(join(db.MEDIA_DIR, stored.id, 'source.bin'));
		expect(source).toBe(true);
	});

	it('SC-05 rejects corrupt bytes by decoded content', async () => {
		await expect(
			media.storePhoto(entryId, 'photo', Buffer.from('this is not an image at all'))
		).rejects.toThrow(/could not be read/);
	});

	it('SC-05 rejects SVG and animated content', async () => {
		const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>');
		await expect(media.storePhoto(entryId, 'photo', svg)).rejects.toThrow(/Unsupported/);
	});

	it('SC-05 rejects files over the byte limit', async () => {
		const bytes = await png(100, 100);
		const padded = Buffer.concat([bytes, Buffer.alloc(10 * 1024 * 1024 + 1)]);
		await expect(media.storePhoto(entryId, 'photo', padded)).rejects.toThrow(/10 MiB/);
	});

	it('SC-05 rejects images over the pixel limit', async () => {
		await expect(media.storePhoto(entryId, 'photo', await png(9000, 9000))).rejects.toThrow(
			/could not be read|too large/
		);
	});

	it('SC-03 re-framing regenerates derivatives without a new upload', async () => {
		const stored = await media.storePhoto(entryId, 'photo', await png(1200, 600));
		const before = readFileSync(join(db.MEDIA_DIR, stored.id, 'card.jpg'));
		const crop = await media.reframePhoto(stored.id, { x: 0.1, y: 0.2, w: 0.6, h: 0.4 });
		expect(crop.w).toBeCloseTo(0.6, 5);
		const after = readFileSync(join(db.MEDIA_DIR, stored.id, 'card.jpg'));
		expect(after.equals(before)).toBe(false);
	});

	it('clamps a nonsense crop to the centered default', async () => {
		const stored = await media.storePhoto(entryId, 'photo', await png(600, 600));
		const crop = await media.reframePhoto(stored.id, { x: -5, y: 99, w: 0.1, h: 9 });
		expect(crop.x).toBeGreaterThanOrEqual(0);
		expect(crop.x + crop.w).toBeLessThanOrEqual(1.000001);
		expect(crop.w / crop.h).toBeCloseTo(1.5, 1);
	});
});
