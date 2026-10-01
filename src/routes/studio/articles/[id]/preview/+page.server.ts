import { error, isRedirect, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getEntry } from '$lib/server/db';
import { publishEntry, withdrawEntry } from '$lib/server/publish';
import { deriveExcerpt, renderBody } from '$lib/server/markdown';
import { actionFail } from '$lib/server/form';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.owner) error(401, 'Sign in required.');
	const entry = getEntry(params.id);
	if (!entry || entry.kind !== 'article') error(404, 'No such article.');
	const rendered = entry.d_source ? renderBody(entry.d_source) : { html: '', imageWarnings: [] };
	return {
		entry,
		html: rendered.html,
		imageWarnings: rendered.imageWarnings,
		excerpt: entry.d_excerpt || deriveExcerpt(entry.d_source ?? ''),
		coverUrl: entry.d_cover_id ? `/media/${entry.d_cover_id}/card` : null,
		version: entry.draft_version
	};
};

export const actions: Actions = {
	publish: async ({ request, params, locals }) => {
		if (!locals.owner) return actionFail(new Error('nope'));
		const form = await request.formData();
		try {
			const result = publishEntry(params.id, Number(form.get('expectedVersion')));
			redirect(303, `/writing/${result.slug}`);
		} catch (err) {
			if (isRedirect(err)) throw err;
			return actionFail(err);
		}
	},
	withdraw: async ({ request, params, locals }) => {
		if (!locals.owner) return actionFail(new Error('nope'));
		const form = await request.formData();
		try {
			withdrawEntry(params.id, Number(form.get('expectedVersion')));
			return { withdrawn: true };
		} catch (err) {
			return actionFail(err);
		}
	}
};
