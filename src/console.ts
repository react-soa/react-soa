import {Store} from "./provider";

export function addToConsole(context: Store) {
	(window as any).__CONTEXT = context;
	(window as any).__SERVICE = context.services.reduce((acc, service) => {
		acc[service.serviceName || service.constructor.name] = service;
		return acc;
	}, {} as any);
}