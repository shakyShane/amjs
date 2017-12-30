let {BehaviorSubject} = require('rxjs/BehaviorSubject');
namespace amjs {
    export type Address = string;
    export type WorkerPath = string;

    export function addWorker(factory, addEventListener, postmessage) {
        let ack$ = new Subject();
        let hasInstance = false;
        let instance;
        let _address;
        let state;

        function createContext(address: string) {
            return {
                actorOf(...args): ActorRef {
                    const name = args[1] || uuid();
                    const createChildMessage: CreateChildActorMessage = {
                        type: MessageTypes.CreateChildActor,
                        message: {
                            workerPath: args[0],
                            parent: actorRef(address),
                            name,
                        },
                        sender: actorRef(_address),
                        messageID: uuid()
                    };

                    postmessage(createChildMessage);

                    return {
                        address: [address, name].join('/'),
                    }
                },
                send(ref: ActorRef, message: any) {

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

                    postmessage(outgoingMessage);

                    return ack$
                        .filter((x: Message) => x.type === MessageTypes.Ack)
                        .filter((x: OutgoingMessage) => x.message.respID === messageID)
                        .pluck('message')
                        .take(1)
                        .toPromise();
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
                    // const parent = message.sender;
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

                    postmessage(readyMessage);

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
                                    respID: message.messageID,
                                    payload,
                                },
                                sender: actorRef(_address),
                                messageID: uuid()
                            };
                            postmessage(outgoingMessage);
                            if (stateSetter && typeof stateSetter === 'function') {
                                setState(stateSetter);
                            }
                        };

                        try {
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
