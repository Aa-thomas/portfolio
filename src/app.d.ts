import type { Session } from './lib/server/auth';

declare global {
	namespace App {
		// eslint-disable-next-line no-unused-vars
		interface Locals {
			owner: Session | null;
		}
	}
}

export {};
