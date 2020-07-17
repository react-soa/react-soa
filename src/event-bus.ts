export type Listener = (...args: any[]) => any;
export type Unsubscribe = () => any;

export class EventBus {
	listeners: Listener[] = [];
	dispatch = (...args: any[]) => {
		this.listeners.forEach(listener => listener(...args));
	};
	listen = (listener: Listener): Unsubscribe => {
		this.listeners.push(listener);
		return () => {
			const idx = this.listeners.indexOf(listener);
			if (idx > -1) {
				this.listeners.splice(idx, 1);
			}
		};
	};
	detach = (listener: Listener) => {
		const idx = this.listeners.indexOf(listener);
		if (idx > -1) {
			this.listeners.splice(idx, 1);
		}
	};
}