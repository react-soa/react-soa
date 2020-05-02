import {DebounceOptions, EventBus, ThrottleOptions} from "./tools";

export const config = {
	counter: 0,
	services: [] as any[],
};

export type TimerOptions = { stopped: boolean; name: string; count: number; single: boolean };
export type Metadata = Partial<{
	id: number;
	order: number;
	observables: { key: string }[];
	wired: { key: string }[];
	debounceFunctions: {key: string, ms: number; options?: Partial<DebounceOptions>}[];
	throttleFunctions: {key: string, ms: number; options?: Partial<ThrottleOptions>}[];
	timers: { key: string; ms: number, options?: Partial<TimerOptions> }[];
	channel: EventBus;
	[key: string]: any;
}>;

export function metadataOf(target: any): Metadata {
	return target.__metadata__ || {};
}

export function metadata(target: any, value: Metadata) {
	Object.defineProperty(target, '__metadata__', {
		configurable: true,
		enumerable: false,
		writable: false,
		value: {
			...metadataOf(target),
			...value,
		}
	});
}
