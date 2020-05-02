import {Soa} from "./provider";

export function startTimer(timer: any) {
	(timer as any).start();
}

export function stopTimer(timer: any) {
	(timer as any).start();
}

export class Service {
	get context(): Soa {
		return (this as any).__context__;
	}

	startTimer(timer: any) {
		startTimer(timer);
	}

	stopTimer(timer: any) {
		stopTimer(timer);
	}
	created(...args: any[]) {
	}

	messageReceived(...args: any[]) {
	}
}