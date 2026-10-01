import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { destroySession } from '$lib/server/auth';
import { createEntry, libraryList } from '$lib/server/publish';
import { SESSION_COOKIE } from '../../hooks.server';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.owner) redirect(303, '/studio/login');
	return { entries: libraryList() };
};

export const actions: Actions = {
	createProject: async ({ locals }) => {
		if (!locals.owner) return fail(401, { message: 'Sign in first.' });
		const entry = createEntry('project');
		redirect(303, `/studio/projects/${entry.id}`);
	},
	createArticle: async ({ locals }) => {
		if (!locals.owner) return fail(401, { message: 'Sign in first.' });
		const entry = createEntry('article');
		redirect(303, `/studio/articles/${entry.id}`);
	},
	logout: async ({ locals, cookies }) => {
		// Sign-out ends the session server-side: a form left open in another
		// tab cannot authorize anything afterwards (SC-01).
		const token = cookies.get(SESSION_COOKIE);
		if (token) destroySession(token);
		cookies.delete(SESSION_COOKIE, { path: '/' });
		redirect(303, '/');
	}
};
