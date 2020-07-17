import {config, metadata, metadataOf} from "./metadata";
import {SoaContext, Store} from "./provider";
import {invoke, invokeAll} from "./invoke";
import {throttle} from "./throttle";
import {debounce} from "./debounce";
import {EventBus} from "./event-bus";
import {h} from "preact";

export function Service(target: any) {
	const id = config.counter++;
	config.services[id] = target;
	metadata(target.prototype, {id, channel: new EventBus()});
	Object.defineProperty(target.prototype, 'serviceId', {
		configurable: false,
		enumerable: true,
		writable: false,
		value: id,
	});
	return target;
}

export function Hub(target: any) {
	const id = config.counter++;
	config.services[id] = target;
	metadata(target.prototype, {id, hub: true, channel: new EventBus()});
	Object.defineProperty(target.prototype, 'serviceId', {
		configurable: false,
		enumerable: true,
		writable: false,
		value: id,
	});
	return target;
}

export function observable(target: any, key: string) {
	const {observables = []} = metadataOf(target);
	metadata(target, {
		observables: [
			...observables,
			key
		]
	});
}

export function pick<T>(target: { new(container?: Store): T }, base?: any): T {
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

export function createStore(): Store {
	const container: Store = {} as Store;
	container.updates = new EventBus();
	container.channel = new EventBus();
	container.services = config.services.map(cls => Object.create(cls.prototype));
	for (let i = 0; i < container.services.length; i++) {
		registerService(container, container.services[i]);
	}
	container.pick = (target) => {
		const meta = metadataOf(target.prototype);
		return container.services[meta.id];
	};
	container.broadcast = (...args) => container.channel.dispatch(...args);
	container.invoke = async (target, name, ...args) => await invoke(container, target, name, ...args);
	container.invokeAll = async (name, ...args) => await invokeAll(container, 'all', name, ...args);
	container.invokeLinear = async (name, ...args) => await invokeAll(container, 'linear', name, ...args);
	container.invokeParallel = async (name, ...args) => await invokeAll(container, 'parallel', name, ...args);
	container.invokeRace = async (name, ...args) => await invokeAll(container, 'race', name, ...args);
	return container;
}

function registerService(container: Store, service: any) {
	const {channel, triggers, hub, observables = [], timers = [], wired = [], throttleFunctions = [], debounceFunctions = []} = metadataOf(service);
	Object.defineProperty(service, '__context__', {
		value: container,
		configurable: false,
		enumerable: false,
		writable: false,
	});
	service.constructor(container);
	wired.forEach(key => {
		const {id} = metadataOf(service[key].prototype);
		service[key] = container.services[id];
	});
	throttleFunctions.forEach((data) => {
		const {key, options, ms} = data;
		const func = throttle(service[key].bind(service), ms, options);
		Object.defineProperty(service, key, {
			configurable: true,
			writable: false,
			enumerable: true,
			value: func,
		});
	});
	debounceFunctions.forEach((data) => {
		const {key, options, ms} = data;
		const func = debounce(service[key].bind(service), ms, options);
		Object.defineProperty(service, key, {
			configurable: true,
			writable: false,
			enumerable: true,
			value: func,
		});
	});
	timers.forEach((data, i) => {
		const {key, ms, options} = data;
		let timer: any = null;
		let startDate: Date = null;
		let counter = 0;

		function stop() {
			clearTimeout(timer);
			timer = null;
			counter = 0;
		}

		function recall() {
			timer = setTimeout(() => {
				if (options && typeof options.count == 'number') {
					if (++counter > options.count) {
						stop();
						return;
					}
				}
				const response = service[key].call(service, startDate);
				if (response !== false) {
					recall();
				}
			}, ms)
		}

		Object.defineProperty(service[key], 'stop', {
			writable: false,
			enumerable: true,
			value: stop,
			configurable: true,
		});

		Object.defineProperty(service[key], 'start', {
			writable: false,
			enumerable: true,
			value: function () {
				if (timer) {
					if (options && options.single) {
						return;
					}
					stop();
				}
				startDate = new Date();
				recall();
			},
			configurable: true,
		});
		if (!options || !options.stopped) {
			startDate = new Date();
			counter = 0;
			recall();
		}
	});

	function registerListener(key: string) {
		const alias = `$$${key}`;
		Object.defineProperty(service, alias, {
			configurable: true,
			writable: false,
			enumerable: false,
			value: service[key],
		});
		Object.defineProperty(service, key, {
			configurable: true,
			enumerable: true,
			get: () => {
				return service[alias];
			},
			set: (value: any) => {
				if (service[alias] !== value) {
					Object.defineProperty(service, alias, {
						configurable: true,
						writable: false,
						enumerable: false,
						value: value,
					});
					if (!!triggers && !!triggers[key]) {
						triggers[key].forEach(name => service[name].call(service));
					}
					channel.dispatch(key, value);
					container.updates.dispatch(service, key, value)
				}
			}
		});
	}

	if (hub) {
		const obj = Object.getOwnPropertyDescriptors(service);
		Object.keys(obj).forEach(key => {
			const item = obj[key];
			if (!item.enumerable || !item.writable)
				return;
			const value = item.value;
			if (typeof value === 'function')
				return;
			registerListener(key);
		});
	} else {
		observables.forEach(registerListener);
	}
	if (typeof service.messageReceived === 'function') {
		container.channel.listen(service.messageReceived.bind(service))
	}
}

export function SoaProvider(props: { store: Store; children?: any }) {
	return (
		<SoaContext.Provider value={props.store}>
			{props.children}
		</SoaContext.Provider>
	);
}

export function wired(target: any, key: string) {
	const {wired = []} = metadataOf(target);
	metadata(target, {
		wired: [
			...wired,
			key,
		]
	});
}

export function Name(name: string) {
	return function (target: any) {
		metadata(target.prototype, {name});
		Object.defineProperty(target.prototype, 'serviceName', {
			configurable: false,
			enumerable: true,
			writable: false,
			value: name,
		});
		return target;
	}
}

export enum Ordered {
	HIGHEST_PRECEDENCE = -999999999,
	DEFAULT = 0,
	LOWEST_PRECEDENCE = 999999999,
}

export function Order(order: number) {
	return function (target: any) {
		metadata(target.prototype, {order});
		return target;
	}
}

export class IService {
	get context(): Store {
		return (this as any).__context__;
	}

	startTimer(timer: any) {
		timer.start();
	}

	stopTimer(timer: any) {
		timer.stop();
	}

	messageReceived(...args: any[]) {
	}
}