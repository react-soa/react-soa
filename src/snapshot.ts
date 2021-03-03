import {metadata, metadataOf} from "./metadata";
import {Store} from "./provider";

type Options = {
	type?: string;
	validate?: (options: { metadata: any, key: string }) => any;
}

export function persisted(target: any, key: string) {
	const {persisted = []} = metadataOf(target);
	metadata(target, {
		persisted: [
			...persisted,
			{key}
		]
	});
}


export function getSnapshot(context: Store, options?: Options) {
	return context.services.reduce((acc, service) => {
		const {id} = metadataOf(service);
		const obj = getServiceSnapshot(service, options);
		if (obj) acc[id] = obj;
		return acc;
	}, {} as any);
}

export function getServiceSnapshot<T>(service: { new(container?: Store): T }, options?: Options): any {
	const opt = options || {
		type: 'persisted',
		validate: null,
	};
	const type = opt.type || 'persisted';
	const validate = opt.validate;

	const meta = metadataOf(service);
	const keys = meta[type] || [];
	if (keys.length > 0) {
		const obj = {};
		keys.forEach(m => {
			const {key} = m;
			if (validate && !validate({metadata: meta, key}))
				return;
			obj[key] = service[key];
		});
		return obj;
	}
}

export function restoreSnapshot(context: Store, data: any, options?: Options) {
	context.services.forEach((service) => {
		const {id} = metadataOf(service);
		restoreServiceSnapshot(service, data[id], options);
	});
}

export function restoreServiceSnapshot<T>(service: { new(container?: Store): T }, data: any, options?: Options) {
	const opt = options || {
		type: 'persisted',
		validate: null,
	};
	const type = opt.type || 'persisted';
	const validate = opt.validate;


	const meta = metadataOf(service);
	const keys = meta[type] || [];
	if (keys.length > 0) {
		if (!!data) {
			keys.forEach(m => {
				const {key} = m;
				if (typeof data[key] !== 'undefined') {
					console.log(data[key]);
					if (validate && !validate({metadata: meta, key}))
						return;
					service[key] = data[key];
				}
			});
		}
	}
	return false;
}