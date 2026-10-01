export default async () => ({
	statusCode: 200,
	body: JSON.stringify({
		node: process.version,
		hasSqlite: (() => { try { return !!process.binding; } catch { return 'n/a' } })(),
		sqliteImport: await import('node:sqlite').then(() => 'ok').catch((e) => e.message.slice(0, 80))
	})
});
