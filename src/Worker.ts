let {BehaviorSubject} = require('rxjs/BehaviorSubject');

namespace amjs {
    export type Address = string;
    export function addWorker(factory, addEventLister, postmessage) {
        let hasInstance = false;
        let instance;
        let _address;
        let state;

        function createContext() {
            return {}
        }

        addEventLister('message', function(e) {
            const message: Message = e.data;
            switch(message.type) {
                case MessageTypes.PreStart: {
                    if (!hasInstance) {

                        const {address} = message.message;

                        _address = address;
                        // const parent = message.sender;
                        const context = createContext();

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
                            instance.postStart();
                        }

                        const readyMessage: Message = {
                            type: MessageTypes.PostStart,
                            message: {},
                            sender: actorRef(address),
                            messageID: uuid()
                        };
                        postmessage(readyMessage);
                    }
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

                        instance.receive(message, {respond, setState, state: state.getValue()});
                    }
                }
            }
        })
    }
}
