export async function delay(ms: number) {
	await new Promise((a) => setTimeout(a, ms));
}