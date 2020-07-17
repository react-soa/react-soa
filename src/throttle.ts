import {debounce} from "./debounce";

export type ThrottleOptions = { leading: boolean, trailing: boolean, maxWait: number };

export function throttle(func: any, wait: number, options?: Partial<ThrottleOptions>) {
	let leading = true,
		trailing = true;

	if (typeof options === 'object') {
		leading = 'leading' in options ? !!options.leading : leading;
		trailing = 'trailing' in options ? !!options.trailing : trailing;
	}
	return debounce(func, wait, {
		leading,
		maxWait: wait,
		trailing,
	});
}