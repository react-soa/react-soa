export function optional<T>(fn: () => T, def?: T): T {
	try {
		const res = fn() as any;
		if (!res && res !== 0)
			return def;
		return res;
	} catch (e) {
		return def;
	}
}