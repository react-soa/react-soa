import {DebounceOptions} from "./debounce";
import {metadata, metadataOf, TimerOptions} from "./metadata";
import {ThrottleOptions} from "./throttle";

export function debounced(ms: number, options?: Partial<DebounceOptions>) {
	return function (target: any, key: string) {
		const {debounceFunctions = []} = metadataOf(target);
		metadata(target, {
			debounceFunctions: [
				...debounceFunctions,
				{
					key,
					ms,
					options,
				}
			],
		});
	}
}

export function throttled(ms: number, options?: Partial<ThrottleOptions>) {
	return function (target: any, key: string) {
		const {throttleFunctions = []} = metadataOf(target);
		metadata(target, {
			throttleFunctions: [
				...throttleFunctions,
				{
					key,
					ms,
					options,
				}
			],
		});
	}
}

export function timer(ms: number, options?: Partial<TimerOptions>) {
	return function (target: any, key: string) {
		const {timers = []} = metadataOf(target);
		metadata(target, {
			timers: [
				...timers,
				{key, ms, options}
			],
		});
	}
}

export function trigger(name: string) {
	return function (target: any, key: string) {
		const {triggers = {}} = metadataOf(target);
		triggers[name] = triggers[name] || [];
		triggers[name].push(key);
		metadata(target, {
			triggers,
		});
	}
}


export function listen<K extends keyof WindowEventMap>(event: K) {
	return function (target: any, key: string) {
		const {listeners = []} = metadataOf(target);
		metadata(target, {
			listeners: [
				...listeners,
				{key, event}
			],
		});
	}
}