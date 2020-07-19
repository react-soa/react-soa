import {metadata, metadataOf} from "./metadata";
import {Store} from "./provider";
import {optional} from "./optional";

export function persisted(target: any, key: string) {
	const {persisted = []} = metadataOf(target);
	metadata(target, {
		persisted: [
			...persisted,
			{key}
		]
	});
}

export function getSnapshot(context: Store) {
	return context.services.reduce((acc, service) => {
		const {id} = metadataOf(service);
		const obj = getServiceSnapshot(service);
		if (obj) acc[id] = obj;
		return acc;
	}, {} as any);
}

export function getServiceSnapshot<T>(service: { new(container?: Store): T }): any {
	const {persisted = []} = metadataOf(service);
	if (persisted.length > 0) {
		const obj = {};
		persisted.forEach((meta) => {
			const {key} = meta;
			obj[key] = service[key];
		});
		return obj;
	}
}

export function restoreSnapshot(context: Store, d: any) {
	context.services.forEach((service) => {
		const {id} = metadataOf(service);
		restoreServiceSnapshot(service, d[id]);
	});
}

export function restoreServiceSnapshot<T>(service: { new(container?: Store): T }, data: any) {
	const {persisted = []} = metadataOf(service);
	if (persisted.length > 0) {
		if (!!data) {
			persisted.forEach((meta) => {
				const {key} = meta;
				if (typeof data[key] !== 'undefined') {
					service[key] = data[key];
				}
			});
		}
	}
	return false;
}

export function browserPersist(context: Store, data: any, onSave: (data: any) => any) {
	if (!!data) optional(() => restoreSnapshot(context, JSON.parse(data)));
	['visibilitychange', 'pagehide', 'freeze'].forEach((type) => {
		window.addEventListener(type, () => {
			if (type === 'visibilitychange' && document.visibilityState === 'visible') return;
			onSave(JSON.stringify(getSnapshot(context)));
		}, {capture: true});
	});
}