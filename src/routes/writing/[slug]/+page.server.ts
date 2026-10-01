import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { publishedArticle } from '$lib/queries';

export const load: PageServerLoad = async ({ params }) => {
	const article = publishedArticle(params.slug);
	if (!article) error(404, 'That article does not exist or is not published.');
	return { article };
};
