import { fail, type ActionFailure } from '@sveltejs/kit';
import { ConflictError, NotFoundError, ValidationError } from './publish';
import { MediaError } from './media';
import { MarkdownError } from './markdown';

export type FailData = {
	message: string;
	field?: string;
	conflict?: boolean;
	values?: Record<string, string>;
};

/** Map lifecycle errors to form failures without leaking internals. */
export function actionFail(
	err: unknown,
	extra: Record<string, unknown> = {}
): ActionFailure<FailData & Record<string, unknown>> {
	const base = { ...extra };
	if (err instanceof ConflictError) {
		return fail(409, { message: err.message, conflict: true, ...base });
	}
	if (err instanceof ValidationError) {
		return fail(400, { message: err.message, field: err.field, ...base });
	}
	if (err instanceof MediaError) {
		return fail(400, { message: err.message, field: 'photo', ...base });
	}
	if (err instanceof MarkdownError) {
		return fail(400, { message: err.message, field: 'importFile', ...base });
	}
	if (err instanceof NotFoundError) {
		return fail(404, { message: 'That entry no longer exists.', ...base });
	}
	console.error(err);
	return fail(500, {
		message: 'Something failed while saving. Nothing was changed — try again.',
		...base
	});
}

export function requireOwner(locals: App.Locals): boolean {
	return locals.owner !== null;
}
