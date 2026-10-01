import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readMediaFile, photoIsPublic } from '$lib/server/media';

/**
 * The only media origin. A photo is served anonymously when (and only when)
 * some published snapshot references it; draft media requires the owner
 * session (SC-02/SC-15). After withdrawal the origin itself answers 404.
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	const { id, variant } = params;
	if (!['card', 'card2x', 'full', 'source'].includes(variant)) {
		error(404, 'Unknown media variant.');
	}
	const isPublic = variant !== 'source' && photoIsPublic(id);
	if (!isPublic && !locals.owner) {
		error(404, 'Not found.');
	}
	const file = readMediaFile(id, variant);
	if (!file) error(404, 'Not found.');
	return new Response(new Uint8Array(file.bytes), {
		headers: {
			'Content-Type': file.mime,
			'Cache-Control': isPublic
				? 'public, max-age=3600, must-revalidate'
				: 'private, no-store'
		}
	});
};
