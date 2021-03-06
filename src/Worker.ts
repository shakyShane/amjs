let {BehaviorSubject} = require('rxjs/BehaviorSubject');
function getWorkerMethods() {
    return {
        addEventListener,
        postMessage
    }
}
namespace amjs {
    export type MessageID = string;
    export type Address = string;
    export type WorkerPath = string;

    export function addWorker(factory) {
        const {addEventListener, postMessage} = getWorkerMethods();
        let ack$ = new Subject();
        let hasInstance = false;
        let instance;
        let _address;
        let state;

        /**
         * Helper for responding to an ack
         * @param {amjs.MessageID} messageID
         * @returns {Promise<any>}
         */
        function getAck(messageID: MessageID): Promise<any> {
            return ack$
                .filter((x: Message) => x.type === MessageTypes.Ack)
                .filter((x: OutgoingMessage) => x.message.responseID === messageID)
                .pluck('message')
                .take(1)
                .toPromise();
        }

        function createContext(address: string) {
            function _send(ref: ActorRef, message: any): MessageID {
                const messageID = uuid();
                const outgoingMessage: SendMessage = {
                    type: MessageTypes.Send,
                    message: {
                        target: ref,
                        payload: message,
                    },
                    sender: actorRef(address),
                    messageID: messageID
                };

                (postMessage as any)(outgoingMessage);

                return messageID;
            }
            return {
                actorOf(workerPath: string, _name?: string): ActorRef {
                    const name = _name || uuid();
                    const createChildMessage: CreateChildActorMessage = {
                        type: MessageTypes.CreateChildActor,
                        message: {
                            workerPath,
                            parent: actorRef(address),
                            name,
                        },
                        sender: actorRef(_address),
                        messageID: uuid()
                    };

                    (postMessage as any)(createChildMessage);

                    return {
                        address: [address, name].join('/'),
                    }
                },
                send(ref: ActorRef, message: any): MessageID {
                    return _send(ref, message);
                },
                sendAndWait(ref: ActorRef, message: any): Promise<any> {
                    const messageID = _send(ref, message);
                    return getAck(messageID);
                },
                stop(ref: ActorRef): MessageID {
                    return _send(ref, MessageTypes.Stop);
                },
                stopAndWait(ref: ActorRef): Promise<any> {
                    const messageID = _send(ref, MessageTypes.Stop);

                    return getAck(messageID);
                },
                actorSelection(search: string): Promise<ActorRef[]> {
                    const messageID = uuid();
                    const message: ActorSelectionMessage = {
                        type: MessageTypes.ActorSelection,
                        message: search,
                        messageID,
                        sender: actorRef(_address),
                    };

                    (postMessage as any)(message);

                    return getAck(messageID);
                }
            }
        }

        addEventListener('message', function(e) {
            const message: Message = e.data;
            switch(message.type) {

                case MessageTypes.PreStart: {
                    if (hasInstance) {
                        return;
                    }

                    const {address} = message.message;

                    _address = address;

                    const context = createContext(_address);

                    instance = new factory(address, context);
                    hasInstance = true;

                    const initialState = (() => {
                        if (typeof instance.initialState === 'function') {
                            return initialState(address, context);
                        }
                        return instance.initialState;
                    })();

                    state = new BehaviorSubject(initialState);

                    if (instance.postStart) {
                        try {
                            console.log(`[${_address}] postStart()`);
                            instance.postStart();
                        } catch (e) {
                            console.log(`Error in postStart() of ${_address}`, e);
                        }
                    }

                    const readyMessage: Message = {
                        type: MessageTypes.PostStart,
                        message: {},
                        sender: actorRef(address),
                        messageID: uuid()
                    };

                    (postMessage as any)(readyMessage);

                    break;
                }
                case MessageTypes.Incoming: {
                    if (instance && instance.receive) {

                        const setState = (fn) => {
                            if (typeof fn === 'function') {
                                const newState = fn(state.getValue());
                                return state.next(newState);
                            } else {
                                return state.next(fn);
                            }
                        };

                        const respond = function(payload: any, stateSetter?: Function) {
                            const outgoingMessage: OutgoingMessage = {
                                type: MessageTypes.Outgoing,
                                message: {
                                    target: message.sender,
                                    responseID: message.messageID,
                                    payload,
                                },
                                sender: actorRef(_address),
                                messageID: uuid()
                            };
                            (postMessage as any)(outgoingMessage);
                            if (stateSetter && typeof stateSetter === 'function') {
                                setState(stateSetter);
                            }
                        };

                        try {
                            console.log(`[${_address}] receive() --- `, message.message);
                            instance.receive(message, {respond, setState, state: state.getValue()});
                        } catch (e) {
                            console.log(`Error from receive() of ${_address}`);
                        }
                    }
                    break;
                }
                case MessageTypes.ChildError: {
                    console.log(message);
                    break;
                }
                case MessageTypes.Ack: {
                    ack$.next(message);
                    break;
                }
            }
        })
    }
}
