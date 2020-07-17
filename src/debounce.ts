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
		maxWait = maxing ? Math.max(Number(options.maxWait) || 0, wait) : maxWait;
		trailing = 'trailing' in options ? !!options.trailing : trailing;
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
		lastInvokeTime = time;
		timerId = setTimeout(timerExpired, wait);
		return leading
			? invokeFunc(time)
			: result;
	}

	function remainingWait(time: number) {
		let timeSinceLastCall = time - lastCallTime,
			timeSinceLastInvoke = time - lastInvokeTime,
			result = wait - timeSinceLastCall;
		return maxing
			? Math.min(result, maxWait - timeSinceLastInvoke)
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
		timerId = setTimeout(timerExpired, remainingWait(time));
	}

	function trailingEdge(time: number) {
		timerId = undefined;
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
		return timerId === undefined ? result : trailingEdge(Date.now());
	}

	function debounced() {
		let time = Date.now(), isInvoking = shouldInvoke(time);
		lastArgs = arguments;
		lastThis = this;
		lastCallTime = time;
		if (isInvoking) {
			if (timerId === undefined) {
				return leadingEdge(lastCallTime);
			}
			if (maxing) {
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