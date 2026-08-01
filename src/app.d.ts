import type { D1Database } from '@cloudflare/workers-types';

declare global {
	namespace App {
		interface Locals {}
		interface Platform {
			env: {
				DB: D1Database;
				/** Só em desenvolvimento, via `.dev.vars`: o Access não roda local (§6). */
				DEV_AUTHOR?: string;
			};
		}
	}
}

export {};
