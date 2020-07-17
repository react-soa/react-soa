import {ThrottleOptions} from "./throttle";
import {DebounceOptions} from "./debounce";
import {EventBus} from "./event-bus";

export const config = {
	counter: 0,
	services: [] as any[],
};

export type TimerOptions = { stopped: boolean; name: string; count: number; single: boolean };
export type Metadata = Partial<{
	id: number;
	order: number;
	name: string;
	hub: boolean;
	observers: { [key: number]: string };
	triggers: { [key: string]: string[] };
	observables: string[];
	wired: string[];
	debounceFunctions: { key: string, ms: number; options?: Partial<DebounceOptions> }[];
	throttleFunctions: { key: string, ms: number; options?: Partial<ThrottleOptions> }[];
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
