import type { PageServerLoad } from './$types';
import { listPublishedProjects } from '$lib/queries';

export const load: PageServerLoad = async () => {
	return { projects: listPublishedProjects() };
};
