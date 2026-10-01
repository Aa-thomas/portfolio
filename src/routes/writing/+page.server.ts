import type { PageServerLoad } from './$types';
import { listPublishedArticles } from '$lib/queries';

export const load: PageServerLoad = async () => {
	return { articles: listPublishedArticles() };
};
