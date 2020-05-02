import {useContext, useEffect, useRef, useState} from "react";
import {Soa, SoaContext} from "./provider";
import {metadataOf} from "./metadata";
import {throttle} from "./tools";

export function useService<T>(target: { new(container?: Soa): T }): T {
	useBus([target]);
	const container = useContext(SoaContext);
	const meta = metadataOf(target.prototype);
	return container ? container.services[meta.id] : null;
}

export function useBus(types?: { new(container?: Soa): any }[]) {
	const container = useContext(SoaContext);
	const upd = useState(0);
	const ref = useRef({
		released: false,
		toRelease: [],
	}).current;
	const update = useRef(throttle(() => {
		if (ref.released)
			return;
		upd[1](a => a + 1)
	}, 50)).current;

	useEffect(() => {
		if (types && types.length > 0) {
			types.forEach(typ => {
				const {id} = metadataOf(typ.prototype);
				const {channel} = metadataOf(container.services[id]);
				const listener = channel.listen(() => {
					if (ref.released || !update)
						return;
					update();
				});
				ref.toRelease.push(listener);
			});
		}
		return () => {
			ref.released = true;
			ref.toRelease.forEach(func => func());
		}
		// eslint-disable-next-line
	}, []);

}
