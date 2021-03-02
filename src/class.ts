import {SoaContext, Store} from "./provider";
import {metadata, metadataOf} from "./metadata";

function union(setA: Set<number>, setB: Set<number>) {
	let _union = new Set(setA);
	setB.forEach(elem => {
		_union.add(elem)
	});
	return _union
}

export function Observer(types: { new(container?: Store): any }[]) {
	return function (target: any) {
		const original = target;
		const func = function (props: any, container: Store) {
			const component = this;
			Object.defineProperty(component, '__context__', {
				value: container,
				configurable: false,
				enumerable: false,
				writable: false,
			});
			const toRelease: any[] = [];
			component.released = false;
			const originalComponentDidMount = this.componentDidMount;
			this.componentDidMount = function (...args: any[]) {
				const {observers = {}} = metadataOf(target.prototype);
				const gp1 = new Set(Object.keys(observers).map(a => +a));
				const gp2 = new Set(types.map(typ => metadataOf(typ.prototype).id));
				const both = Array.from(union(gp1, gp2));
				if (both.length > 0) {
					both.forEach(id => {
						const service = container.services[id];
						const {channel} = metadataOf(service);
						const listener = channel.listen((variable: string, value: any) => {
							if (this.released)
								return;
							if (gp1.has(id)) {
								const key = observers[id];
								const fn = this[key];
								if (typeof fn === 'function') {
									if (fn.call(this, service, variable, value) === false) return;
								}
							}
							if (gp2.has(id)) {
								const key = id + variable;
								if (this.beforeSync && this.beforeSync.call(this, service, variable, value) === false) return;
								this.setState(state => {
									const __updater = state ? state.__updater : undefined;
									if (typeof __updater === 'undefined') {
										return {
											__updater: {
												[key]: value,
											}
										} as any;
									} else if (typeof __updater[key] === 'undefined' || __updater[key] !== value) {
										return {
											__updater: {
												...__updater,
												[key]: value,
											}
										}
									} else {
										return state;
									}
								}, () => {
									if (this.afterSync) this.afterSync.call(this, service, variable, value);
								})
							}
						});
						toRelease.push(listener);
					});
				}
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
			original.call(this, props, container);
			const {wired = []} = metadataOf(component);
			wired.forEach(key => {
				const {id} = metadataOf(component[key].prototype);
				component[key] = container.services[id];
			});
		};
		func.contextType = SoaContext;
		func.prototype = original.prototype;
		return func as any;
	}
}

export function observe(type: { new(context?: Store): any }) {
	return (target: any, key: string) => {
		const {id} = metadataOf(type.prototype);
		const {observers = {}} = metadataOf(target);
		metadata(target, {
			observers: {
				...observers,
				[id]: key,
			}
		});
	};
}

export function Bundle(target: any) {
	return Observer([])(target)
}