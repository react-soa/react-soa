import {config, metadata, metadataOf, TimerOptions} from "./metadata";
import {Soa, SoaContext} from "./provider";
import {DebounceOptions, EventBus, throttle, ThrottleOptions} from "./tools";

// -----
export function Bean(target: any) {
	const id = config.counter++;
	config.services[id] = target;
	metadata(target.prototype, {id, channel: new EventBus()});
	return target;
}

export function Bundle(target: any) {
	return Observer([])(target)
}

export enum Ordered {
	HIGHEST_PRECEDENCE = -999999999,
	DEFAULT =  0,
	LEVEL_10 =  -1000,
	LEVEL_20 =  -2000,
	LEVEL_30 =  -3000,
	LEVEL_40 =  -4000,
	LEVEL_50 =  -5000,
	LEVEL_60 =  -6000,
	LEVEL_70 =  -7000,
	LEVEL_80 =  -8000,
	LEVEL_90 =  -9000,
	LOWEST_PRECEDENCE = 999999999,
}

export function Order(order: number) {
	return function (target: any) {
		metadata(target.prototype, {
			order,
		});
		return target;
	}
}

// -----
export function Observer(types?: { new(container?: Soa): any }[]) {
	return function (target: any) {
		const original = target;
		const func = function (props: any, container: Soa) {
			const component = this;
			Object.defineProperty(component, '__context__', {
				value: container,
				configurable: false,
				enumerable: false,
				writable: false,
			});
			if (types && types.length > 0) {
				const toRelease: any[] = [];
				component.released = false;
				this.delayedRefresh = throttle(() => {
					if (this.released)
						return;
					this.forceUpdate(() => {
						if (this.serviceDidUpdate) {
							this.serviceDidUpdate.apply(this)
						}
					});
				}, 50);
				const originalComponentDidMount = this.componentDidMount;
				this.componentDidMount = function (...args: any[]) {
					types.forEach(typ => {
						const {id} = metadataOf(typ.prototype);
						const {channel} = metadataOf(container.services[id]);
						const listener = channel.listen((id: string, value: any) => {
							if (this.released)
								return;
							this.delayedRefresh && this.delayedRefresh(this);
						});
						toRelease.push(listener);
					});
					if (originalComponentDidMount) {
						originalComponentDidMount.apply(this, args);
					}
				};

				const originalComponentWillUnmount = this.componentWillUnmount;
				this.componentWillUnmount = function (...args: any[]) {
					this.released = true;
					if (originalComponentWillUnmount) {
						originalComponentWillUnmount.apply(this, args)
					}
					toRelease.forEach(func => func());
				};
			}

			original.call(this, props, container);
			const {wired = []} = metadataOf(component);
			wired.forEach(data => {
				const {id} = metadataOf(component[data.key].prototype);
				component[data.key] = container.services[id];
			});
		};
		func.contextType = SoaContext;
		func.prototype = original.prototype;
		return func as any;
	}
}

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

export function leading(ms: number) {
	return function (target: any, key: string) {
		const {debounceFunctions = []} = metadataOf(target);
		metadata(target, {
			debounceFunctions: [
				...debounceFunctions,
				{
					key,
					ms,
					options: {leading: true, trailing: false},
				}
			],
		});
	}
}

export function trailing(ms: number) {
	return function (target: any, key: string) {
		const {debounceFunctions = []} = metadataOf(target);
		metadata(target, {
			debounceFunctions: [
				...debounceFunctions,
				{
					key,
					ms,
					options: {leading: false, trailing: true},
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

export function observable(target: any, key: string) {
	const {observables = []} = metadataOf(target);
	metadata(target, {
		observables: [
			...observables,
			{key}
		]
	});
}

export function wired(target: any, key: string) {
	const {wired = []} = metadataOf(target);
	metadata(target, {
		wired: [
			...wired,
			{key}
		]
	});
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

// -----
export function pick<T>(target: { new(container?: Soa): T }, base?: any): T {
	if (!!base) {
		const meta = metadataOf(target.prototype);
		if (!!base.__context__) {
			return base.__context__.services[meta.id];
		}
		if (!!base.context) {
			return base.context.services[meta.id];
		}
		return null;
	} else {
		return Object.create(target);
	}
}
