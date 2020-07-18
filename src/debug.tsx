import React, {Component, Fragment} from "react";
import {metadataOf} from "./metadata";

export class Debug extends Component {
	unsub = null;
	tmr = null;
	state = {
		debugMode: false,
		mode: 1,
		step: 0,
		serviceId: undefined,
		logs: [],
	};
	close = () => {
		this.setState({
			debugMode: false,
		})
	};
	mouseDown = () => {
		if (this.state.debugMode)
			return;
		clearTimeout(this.tmr);
		this.tmr = setTimeout(() => {
			this.setState({
				debugMode: true,
			});
		}, 500);
	};
	mouseUp = () => {
		clearTimeout(this.tmr);
	};

	back = () => {
		switch (this.state.step) {
			case 1:
				this.setState({
					step: 0,
					serviceId: undefined,
					propertyName: undefined,
				});
				break;
			case 2:
				this.setState({
					step: 1,
					propertyName: undefined,
				});
				break;
		}
	};

	convertJson = (arg) => {
		let block = '';
		if (typeof arg === 'object') {
			if (arg === null) {
				block = 'null';
			} else {
				try {
					block = JSON.stringify(arg, ((key, value) => {
						if (typeof value == 'object' && value != null) {
							const obj = {};
							Object.getOwnPropertyNames(value).forEach(name => {
								Object.defineProperty(obj, name, {
									enumerable: true,
									value: value[name],
								})
							});
							return obj;
						}
						return value;
					}) as any, '  ');
				} catch (e) {
					block = 'could not convert';
				}
			}
		} else if (typeof arg === 'undefined') {
			block = 'undefined'
		} else {
			block = arg.toString();
		}
		return block;
	};
	make = (name: string) => {
		const originalLog = (console as any)[name];
		Object.defineProperty(console, name, {
			value: (...args: any[]) => {
				setTimeout(() => {
					const scope = [];
					for (let arg of args) {
						scope.push(this.convertJson(arg));
					}
					this.setState((state: any) => {
						const logs = Array.from(state.logs);
						logs.push({
							'method': name,
							'args': scope,
						});
						const max = 100;
						if (logs.length > max) {
							logs.splice(0, 1);
						}
						return {
							logs,
						}
					})
				}, 0);
				originalLog(...args);
			}
		});
	};

	componentDidMount(): void {
		window.addEventListener('mousedown', this.mouseDown);
		window.addEventListener('mouseup', this.mouseUp);
		window.addEventListener('touchstart', this.mouseDown);
		window.addEventListener('touchend', this.mouseUp);
		window.document.documentElement.style.userSelect = 'none';
		this.make('log');
		this.make('error');
		this.make('warn');
		this.make('info');
	}

	componentWillUnmount(): void {
		window.removeEventListener('mousedown', this.mouseDown);
		window.removeEventListener('mouseup', this.mouseUp);
		window.removeEventListener('touchstart', this.mouseDown);
		window.removeEventListener('touchend', this.mouseUp);
	}

	render() {
		const context = ((window as any).__CONTEXT);
		const {step, mode, logs, debugMode, serviceId} = this.state;
		let descriptors = undefined;
		const service = context.services[serviceId];
		if (typeof serviceId !== 'undefined') {
			descriptors = Object.getOwnPropertyDescriptors(service);
		}
		return (
			<Fragment>
				{debugMode && (
					<div className="debug-screen">
						<div className="debug--navbar-wrapper">
							{step > 0 ? (
								<div className="icon-button back-button" onClick={this.back}>
									<svg className="icon" height="24" viewBox="0 0 24 24" width="24">
										<path fill="#fff" d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
									</svg>
								</div>
							) : (
								<div className="icon-button back-button" onClick={() => {
									this.setState((state: any) => {
										return {
											mode: state.mode === 1 ? 0 : 1,
										}
									})
								}}>
									<svg className="icon" height="24" viewBox="0 0 24 24" width="24">
										<path fill="#fff"
											  d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
									</svg>
								</div>
							)}
							{step === 0 ? (
								mode === 0 ? (

									<div className="header-label">
										<div className="title">SERVICES</div>
									</div>
								) : (
									<div className="header-label">
										<div className="title">CONSOLE</div>
									</div>
								)
							) : (step === 1) ? (
								<div className="header-label">
									<div
										className="title">{(service.serviceName || service.constructor.name).toUpperCase()}</div>
								</div>
							) : null}
							<div className="icon-button close-button" onClick={this.close}>
								<svg className="icon" height="24" viewBox="0 0 24 24" width="24">
									<path fill="#fff"
										  d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
								</svg>
							</div>
						</div>
						{mode === 0 ? (
							step === 0 ? (
								<div className="debug--list">
									{context.services.map((service, i) => {
										const name = service.serviceName || service.constructor.name;
										return <div key={i} className="list-item obj-service" onClick={() => {
											this.setState({
												step: 1,
												serviceId: i,
												propertyName: undefined,
											});
										}}>
											<span>{name}</span>
										</div>;
									})}
								</div>
							) : (step === 1 && !!descriptors) ? (
								<div className="debug--list">
									{Object.keys(descriptors).map((key, i) => {
										const variable = descriptors[key];
										if (!variable.enumerable)
											return null;
										const {observables, wired} = metadataOf(service);
										if (wired && wired.indexOf(key) > -1)
											return null;
										const val = service[key];
										const typ = typeof val;
										const obs = observables && observables.indexOf(key) > -1;
										const show = JSON.stringify(val, null, '  ') + ';';
										let fnq = '';
										if (typ === 'function') {
											fnq = val.toString();
										}
										return <div key={i} className={`list-item ${obs ? 'obj-observable' : ''}`} onClick={() => {
											const value = service[key];
											if (typeof value !== 'function') {
												const val = prompt('Value', JSON.stringify(value));
												if (val !== null) {
													service[key] = eval(`(${val})`);
													this.forceUpdate();
												}
											} else {
												const val = prompt('Arguments', '');
												const args = eval(`([${val}])`);
												if (args !== null) {
													value.apply(service, args);
													this.forceUpdate();
												}
												return;
											}
										}}>
											{typ !== 'function' ? (
												<Fragment>
													<span className="type-def">{typ}</span>
													<span>{key}</span>&nbsp;
													<span>{'='}&nbsp;{show}</span>
												</Fragment>
											) : (
												<Fragment>
													<span className="type-def">{key}</span>
													<span>{'='}&nbsp;{fnq}</span>
												</Fragment>
											)}
										</div>
									})}
								</div>
							) : null
						) : (
							<div className="debug--console">
								{logs.map((log, i) => {
									return <div key={i} className="log-item">
										{log.args.map(arg => <pre>{arg}</pre>)}
									</div>
								})}
							</div>
						)}
					</div>
				)}
			</Fragment>
		);
	}
}