/**
 * Public identity and contact values (SC-22). Only real, supplied values
 * appear here; anything not supplied stays honestly absent and is never a
 * clickable invention. Replacing these is part of release content (D-07).
 */
export const site = {
	name: 'Aaron',
	fullName: 'Aaron Thomas',
	/** Supplied by the repository itself; the only verified external profile. */
	profiles: [
		{
			label: 'GitHub',
			url: 'https://github.com/Aa-thomas'
		}
	] as Array<{ label: string; url: string }>,
	/** No email address has been supplied; shown as pending, not clickable. */
	email: null as string | null
};
