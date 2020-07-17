import {useContext, useEffect, useState} from "preact/hooks";
import {SoaContext, Store} from "./provider";
import {metadataOf} from "./metadata";

export function useService<T>(target: { new(container?: Store): T }): T {
	const container = useContext(SoaContext);
	const meta = metadataOf(target.prototype);
	return container ? container.services[meta.id] : null;
}


export function trackService<T>(target: { new(container?: Store): T }): T {
	useObserver([target]);
	const container = useContext(SoaContext);
	const meta = metadataOf(target.prototype);
	return container ? container.services[meta.id] : null;
}

export function useObserver(types?: { new(container?: Store): any }[]) {
	const container = useContext(SoaContext);
	const updater = useState({});
	useEffect(() => {
		let released = false;
		const releaseQueue = [];
		if (types && types.length > 0) {
			types.forEach(typ => {
				const {id} = metadataOf(typ.prototype);
				const {channel} = metadataOf(container.services[id]);
				const listener = channel.listen((variable, value) => {
					if (released)
						return;
					const key = id + variable;
					updater[1](state => {
						if (typeof state[key] === 'undefined' || state[key] !== value) {
							return {
								...state,
								[key]: value,
							}
						} else {
							return state;
						}
					});
				});
				releaseQueue.push(listener);
			});
		}
		return () => {
			released = true;
			releaseQueue.forEach(func => func());
		}
	}, []);
}
