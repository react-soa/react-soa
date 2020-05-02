import React, {createContext, ReactNode} from "react";
import {config, metadataOf} from "./metadata";
import {debounce, EventBus, throttle} from "./tools";
import {invoke, invokeAll} from "./invoke";

export type Soa = {
	channel: EventBus;
	services?: any[];
	pick<T>(target: { new(container?: Soa): T }): T;
	broadcast(...args: any[]);
	invoke(target: any, name: string, ...args: any[]): Promise<any>;
	invokeAll(name: string, ...args: any[]): Promise<any>;
	invokeParallel(name: string, ...args: any[]): Promise<any>;
	invokeRace(name: string, ...args: any[]): Promise<any>;
	invokeLinear(name: string, ...args: any[]): Promise<any>;
};

export const SoaContext = createContext<Soa>({} as Soa);
export const SoaConsumer = SoaContext.Consumer;

export function SoaProvider(props: { soa: Soa; children: ReactNode }) {
	return (
		<SoaContext.Provider value={props.soa}>
			{props.children}
		</SoaContext.Provider>
	);
}

export function createSoa(services?: any): Soa {
	if (!!services) {
		const cache: any = {};
		services.keys().forEach((key: any) => cache[key] = services(key));
	}
	const container: Soa = {} as Soa;
	container.channel = new EventBus();
	container.services = config.services.map(cls => Object.create(cls.prototype));
	for (let i = 0; i < container.services.length; i++) {
		singletonService(container, container.services[i]);
	}
	container.pick = (target) => {
		const meta = metadataOf(target.prototype);
		return container.services[meta.id];
	};
	container.broadcast = (...args) => container.channel.dispatch(...args);
	container.invoke = async (target, name,...args) => await invoke(container, target, name, ...args);
	container.invokeAll = async (name, ...args) => await invokeAll(container, 'all', name, ...args);
	container.invokeLinear = async (name, ...args) => await invokeAll(container, 'linear', name, ...args);
	container.invokeParallel = async (name, ...args) => await invokeAll(container, 'parallel', name, ...args);
	container.invokeRace = async (name, ...args) => await invokeAll(container, 'race', name, ...args);
	container.invokeLinear('created');
	return container;
}

function singletonService(container: Soa, service: any) {
	const {channel, observables = [], timers = [], wired = [], throttleFunctions = [], debounceFunctions = []} = metadataOf(service);
	Object.defineProperty(service, '__context__', {
		value: container,
		configurable: false,
		enumerable: false,
		writable: false,
	});
	service.constructor(container);
	wired.forEach(data => {
		const {id} = metadataOf(service[data.key].prototype);
		service[data.key] = container.services[id];
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

	observables.forEach((data: any) => {
		const {key} = data;
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
					channel.dispatch(key, value);
				}
			}
		});
	});
	if (typeof service.messageReceived === 'function') {
		container.channel.listen(service.messageReceived.bind(service))
	}
}
