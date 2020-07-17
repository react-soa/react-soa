import {createContext} from "preact";
import {EventBus} from "./event-bus";

export type Store = {
	updates: EventBus;
	channel: EventBus;
	services?: any[];
	pick<T>(target: { new(container?: Store): T }): T;
	broadcast(...args: any[]);
	invoke(target: any, name: string, ...args: any[]): Promise<any>;
	invokeAll(name: string, ...args: any[]): Promise<any>;
	invokeParallel(name: string, ...args: any[]): Promise<any>;
	invokeRace(name: string, ...args: any[]): Promise<any>;
	invokeLinear(name: string, ...args: any[]): Promise<any>;
};

export const SoaContext = createContext<Store>({} as Store);