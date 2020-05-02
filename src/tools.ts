const nativeMax = Math.max;
const nativeMin = Math.min;
export type Listener = (...args: any[]) => any;
export type Unsubscribe = () => any;

export async function delay(ms: number) {
	await new Promise((a) => setTimeout(a, ms));
}

export function timeout<T>(promise: Promise<T>, ms: number, error?: any): Promise<T> {
	return Promise.race<T>([
		promise,
		new Promise<T>((resolve, reject) => setTimeout(() => reject(error || new Error("timeout exceeded")), ms)),
	]);
}

export class EventBus {
	listeners: Listener[] = [];
	dispatch = (...args: any[]) => {
		this.listeners.forEach(listener => listener(...args));
	};
	listen = (listener: Listener): Unsubscribe => {
		this.listeners.push(listener);
		return () => {
			this.listeners.splice(this.listeners.indexOf(listener), 1);
		};
	};
}

export type DebounceOptions = { leading: boolean, trailing: boolean, maxWait: number };

export function debounce(func: any, wait: number, options?: Partial<DebounceOptions>) {
	let timerId: any;
	let lastArgs: any;
	let lastThis: any;
	let maxWait: any;
	let result: any;
	let lastCallTime: any;
	let lastInvokeTime = 0;
	let leading = false;
	let maxing = false;
	let trailing = true;
	wait = Number(wait) || 0;
	if (typeof options === 'object') {
		leading = !!options.leading;
		maxing = 'maxWait' in options;
		maxWait = maxing
			? nativeMax(Number(options.maxWait) || 0, wait)
			: maxWait;
		trailing = 'trailing' in options
			? !!options.trailing
			: trailing;
	}

	function invokeFunc(time: number) {
		let args = lastArgs,
			thisArg = lastThis;

		lastArgs = lastThis = undefined;
		lastInvokeTime = time;
		result = func.apply(thisArg, args);
		return result;
	}

	function leadingEdge(time: number) {
		// Reset any `maxWait` timer.
		lastInvokeTime = time;
		// Start the timer for the trailing edge.
		timerId = setTimeout(timerExpired, wait);
		// Invoke the leading edge.
		return leading
			? invokeFunc(time)
			: result;
	}

	function remainingWait(time: number) {
		let timeSinceLastCall = time - lastCallTime,
			timeSinceLastInvoke = time - lastInvokeTime,
			result = wait - timeSinceLastCall;
		return maxing
			? nativeMin(result, maxWait - timeSinceLastInvoke)
			: result;
	}

	function shouldInvoke(time: number) {
		let timeSinceLastCall = time - lastCallTime, timeSinceLastInvoke = time - lastInvokeTime;
		return (lastCallTime === undefined || (timeSinceLastCall >= wait) || (timeSinceLastCall < 0) || (maxing && timeSinceLastInvoke >= maxWait));
	}

	function timerExpired() {
		const time = Date.now();
		if (shouldInvoke(time)) {
			return trailingEdge(time);
		}
		// Restart the timer.
		timerId = setTimeout(timerExpired, remainingWait(time));
	}

	function trailingEdge(time: number) {
		timerId = undefined;

		// Only invoke if we have `lastArgs` which means `func` has been debounced at
		// least once.
		if (trailing && lastArgs) {
			return invokeFunc(time);
		}
		lastArgs = lastThis = undefined;
		return result;
	}

	function cancel() {
		if (timerId !== undefined) {
			clearTimeout(timerId);
		}
		lastInvokeTime = 0;
		lastArgs = lastCallTime = lastThis = timerId = undefined;
	}

	function flush() {
		return timerId === undefined
			? result
			: trailingEdge(Date.now());
	}

	function debounced() {
		let time = Date.now(),
			isInvoking = shouldInvoke(time);
		lastArgs = arguments;
		lastThis = this;
		lastCallTime = time;

		if (isInvoking) {
			if (timerId === undefined) {
				return leadingEdge(lastCallTime);
			}
			if (maxing) {
				// Handle invocations in a tight loop.
				timerId = setTimeout(timerExpired, wait);
				return invokeFunc(lastCallTime);
			}
		}
		if (timerId === undefined) {
			timerId = setTimeout(timerExpired, wait);
		}
		return result;
	}

	debounced.cancel = cancel;
	debounced.flush = flush;
	return debounced;
}

export type ThrottleOptions = { leading: boolean, trailing: boolean, maxWait: number };

export function throttle(func: any, wait: number, options?: Partial<ThrottleOptions>) {
	let leading = true,
		trailing = true;

	if (typeof options === 'object') {
		leading = 'leading' in options
			? !!options.leading
			: leading;
		trailing = 'trailing' in options
			? !!options.trailing
			: trailing;
	}
	return debounce(func, wait, {
		leading,
		maxWait: wait,
		trailing,
	});
}

const s = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
export const range = (size: number) => Array.apply(null, Array(size)).map((a, i) => i);
export const step = (x: number) => x >= 0 ? 1 : 0;
export const ramp = (x: number) => +x * step(x);
export const xrange = (start: number, size: number) => Array.apply(null, Array(~~(size - start + 1)))
	.map((_, j) => j + Math.floor(start));

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

function s4() {
	return Math.floor((1 + Math.random()) * 0x10000)
		.toString(16)
		.substring(1);
}

export function guid() {
	return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
		s4() + '-' + s4() + s4() + s4();
}

export const randomString = (n: number) => Array(n).join().split(',').map(function () {
	return s.charAt(Math.floor(Math.random() * s.length));
}).join('');

