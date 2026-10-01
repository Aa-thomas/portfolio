import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { publishedProject } from '$lib/queries';

export const load: PageServerLoad = async ({ params }) => {
	// Unknown or unpublished slugs return a real 404 from the server (SC-20/22).
	const project = publishedProject(params.slug);
	if (!project) error(404, 'That project does not exist or is not published.');
	return { project };
};
