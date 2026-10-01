import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	return { ownerName: locals.owner?.owner.username ?? null };
};
