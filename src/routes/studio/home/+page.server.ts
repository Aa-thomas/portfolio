import { error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { featuredVersion, MAX_FEATURED, saveFeatured } from '$lib/server/publish';
import { actionFail } from '$lib/server/form';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.owner) error(401, 'Sign in required.');
	const published = db
		.prepare(
			`SELECT id, p_title AS title, p_slug AS slug FROM entries
			 WHERE kind = 'project' AND pub_version IS NOT NULL
			 ORDER BY first_published_at DESC, id ASC`
		)
		.all() as Array<{ id: string; title: string; slug: string }>;
	const featured = (
		db
			.prepare('SELECT project_id FROM featured ORDER BY position')
			.all() as Array<{ project_id: string }>
	).map((row) => row.project_id);
	return { published, featured, version: featuredVersion(), max: MAX_FEATURED };
};

export const actions: Actions = {
	save: async ({ request, locals }) => {
		if (!locals.owner) return actionFail(new Error('nope'));
		const form = await request.formData();
		try {
			let ids: string[];
			try {
				ids = JSON.parse(String(form.get('order') ?? '[]'));
			} catch {
				ids = [];
			}
			saveFeatured(ids, Number(form.get('expectedVersion')));
			return { saved: true };
		} catch (err) {
			return actionFail(err);
		}
	}
};
