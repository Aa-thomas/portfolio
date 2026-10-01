import { error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db, getEntry } from '$lib/server/db';
import { replaceEntryPhoto } from '$lib/server/media';
import { ConflictError, saveProjectDraft, ValidationError } from '$lib/server/publish';
import { actionFail } from '$lib/server/form';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.owner) error(401, 'Sign in required.');
	const entry = getEntry(params.id);
	if (!entry || entry.kind !== 'project') error(404, 'No such project.');
	const photo = entry.d_photo_id
		? (db.prepare('SELECT id, width, height FROM photos WHERE id = ?').get(entry.d_photo_id) as
				| { id: string; width: number; height: number }
				| undefined)
		: undefined;
	return {
		entry,
		photo: photo ?? null,
		crop: entry.d_crop ? JSON.parse(entry.d_crop) : null,
		version: entry.draft_version
	};
};

export const actions: Actions = {
	save: async ({ request, params, locals }) => {
		if (!locals.owner) return actionFail(new ConflictError('Sign in first.', 0));
		const form = await request.formData();
		const values = {
			title: String(form.get('title') ?? ''),
			url: String(form.get('url') ?? ''),
			description: String(form.get('description') ?? ''),
			alt: String(form.get('alt') ?? ''),
			caseStudy: String(form.get('caseStudy') ?? '')
		};
		try {
			const entry = getEntry(params.id);
			if (!entry || entry.kind !== 'project') throw new ValidationError('No such project.');
			const file = form.get('photo');
			const uploaded =
				file instanceof File && file.size > 0 && file.size <= 10 * 1024 * 1024
					? Buffer.from(await file.arrayBuffer())
					: undefined;
			if (file instanceof File && file.size > 10 * 1024 * 1024) {
				throw new ValidationError('That file is larger than the 10 MiB upload limit.', 'photo');
			}
			const remove = form.get('removePhoto') === '1';
			// The photo/metadata update happens before the field update so a
			// processing failure leaves the previous save untouched (SC-05).
			const photo = remove
				? { photoId: null, crop: null }
				: await replaceEntryPhoto(entry.id, 'photo', entry.d_photo_id, uploaded, form.get('crop'));
			const result = saveProjectDraft(
				{
					entryId: entry.id,
					expectedVersion: Number(form.get('expectedVersion')),
					...values
				},
				photo
			);
			return { saved: true, version: result.version };
		} catch (err) {
			return actionFail(err, { values });
		}
	}
};
