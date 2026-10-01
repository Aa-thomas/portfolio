import type { PageServerLoad } from './$types';
import { homeProjects, latestArticles } from '$lib/queries';

export const load: PageServerLoad = async () => {
	// The narrow read boundary starts here: published snapshots only.
	return {
		projects: homeProjects(),
		articles: latestArticles()
	};
};
