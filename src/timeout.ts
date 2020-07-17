export function timeout<T>(promise: Promise<T>, ms: number, error?: any): Promise<T> {
	return Promise.race<T>([
		promise,
		new Promise<T>((resolve, reject) => setTimeout(() => reject(error || new Error("timeout exceeded")), ms)),
	]);
}