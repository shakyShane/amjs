const uuid = require('uuid/v4');
const {Subject} = require('rxjs/Subject');
require('rxjs/add/operator/filter');
require('rxjs/add/operator/take');
require('rxjs/add/operator/do');
require('rxjs/add/operator/pluck');

namespace amjs {
    export interface ActorRef {
        address: Address
    }
    export enum MessageTypes {
        RemoteStop = '@@RemoteStop',
        Stop = '@@Stop',
        Send = '@@Send',
        Ack = '@@Ack',
        PreStart = '@@PreStart',
        PostStart = '@@PostStart',
        Incoming = '@@Incoming',
        Outgoing = '@@Outgoing',
        Response = '@@Response',
        CreateChildActor = '@@CreateChildActor',
        ChildError = '@@ChildError',
    }
    export interface Message<T = any> {
        type: MessageTypes
        message: T
        messageID: string
        sender: ActorRef,
    }
    export interface OutgoingMessagePayload {
        payload: any,
        responseID: Address,
        target: ActorRef
    }
    export interface SendMessagePayload {
        payload: any,
        target: ActorRef
    }
    export interface CreateChildMessagePayload {
        workerPath: WorkerPath,
        parent: ActorRef,
        name: string
    }
    export interface ErrorMessagePayload {
        error: boolean,
        payload: any,
        reason: string,
    }
    export type ErrorMessage = Message<ErrorMessagePayload>
    export type OutgoingMessage = Message<OutgoingMessagePayload>
    export type SendMessage = Message<SendMessagePayload>
    export type CreateChildActorMessage = Message<CreateChildMessagePayload>
    export enum ActorTypes {
        System = 'System',
        Worker = 'Worker'
    }
    export enum ActorStatus {
        Pending = '@@Pending',
        Stopping = '@@Stopping',
        Stopped = '@@Stopped',
        Online = '@@Online',
        Errored = '@@Errored',
    }
    export const validStates = new Set([
        ActorStatus.Online,
        ActorStatus.Pending,
    ]);
    export interface ActorRegisterEntry {
        type: ActorTypes,
        status?: ActorStatus,
        ref: ActorRef,
        worker?: Worker,
        mailbox?: any,
        mailboxForwarderSubscription?: any,
        workerPath?: string,
        parent?: ActorRef,
    }
    export function actorRef(address: string): ActorRef {
        return {address};
    }
    export class ActorSystem {
        public register: Map<string, ActorRegisterEntry>;
        public responses = new Subject();
        constructor(public address: string, public opts: string) {

            const mailbox$ = new Subject();
            const mailboxForwarderSubscription = mailbox$
                .filter((x: Message) => x.type === MessageTypes.ChildError)
                .pluck('message')
                .do(x => {
                    const actor = this.register.get(x.ref.address);
                    actor.status = ActorStatus.Errored;
                    this.actorOf(actor.workerPath, actor.ref.address, actor.parent.address);
                })
                .subscribe();

            this.register = new Map();
            this.register.set(address, {
                type: ActorTypes.System,
                status: ActorStatus.Pending,
                ref: {address},
                mailbox: mailbox$,
                mailboxForwarderSubscription,
            });
        }

        public stop(ref: ActorRef): MessageID {
            const message = MessageTypes.Stop;
            return this._send(ref, message);
        }

        private _removeActorFromRegister(ref: ActorRef) {
            const actor = this.register.get(ref.address);
            if (actor) {
                actor.status = ActorStatus.Stopped;
                this.register.delete(ref.address);
            }
        }

        public stopAndWait(ref: ActorRef): Promise<any> {
            const message = MessageTypes.Stop;
            const messageID = this._send(ref, message);
            return this.responses
                .filter((x: Message) => x.type === MessageTypes.Outgoing)
                .filter((x: OutgoingMessage) => x.message.responseID === messageID)
                .do(() => {
                    this._removeActorFromRegister(ref);
                })
                .pluck('message')
                .take(1)
                .toPromise();
        }

        private _send(ref: ActorRef, message: any): MessageID {
            const actor = this.register.get(ref.address);
            const messageID = uuid();
            if (actor) {
                const m: Message = {
                    sender: actorRef(this.address),
                    type: MessageTypes.Incoming,
                    messageID,
                    message,
                };
                actor.mailbox.next(m);
            }
            return messageID;
        }

        /**
         * @param {amjs.ActorRef} ref
         * @param message
         * @returns {Promise<any>}
         */
        public send(ref: ActorRef, message: any): MessageID {
            return this._send(ref, message);
        }

        static notOnlineMessage(): ErrorMessage {
            // todo: standard error format for these types of errors
            return {
                type: MessageTypes.Outgoing,
                message: {
                    error: true,
                    payload: 'error',
                    reason: 'Actor not online or pending'
                },
                sender: {address: ''},
                messageID: uuid()
            };
        }

        /**
         * @param {amjs.ActorRef} ref
         * @param message
         * @returns {Promise<any>}
         */
        public sendAndWait(ref: ActorRef, message: any): Promise<any> {
            const actor = this.register.get(ref.address);

            if (!actor || !validStates.has(actor.status)) {
                return Promise.resolve(ActorSystem.notOnlineMessage().message);
            }

            const messageID = this._send(ref, message);
            return this.responses
                .filter((x: Message) => x.type === MessageTypes.Outgoing)
                .filter((x: OutgoingMessage) => {
                    return x.message.responseID === messageID;
                })
                .pluck('message')
                .take(1)
                .toPromise();
        }

        /**
         * @param {string} workerPath
         * @param {any} name
         * @param parent
         * @returns {amjs.ActorRef}
         */
        public actorOf (workerPath: string, name = uuid(), parent = '/system'): ActorRef {
            const address = [parent, name].join('/');
            const w = new Worker(workerPath);
            const m: Message = {
                type: MessageTypes.PreStart,
                message: {address},
                sender: actorRef(this.address),
                messageID: uuid()
            };
            w.postMessage(m);
            w.onerror = (e) => {
                if (!e.filename) {
                    // probably a 404 error
                    console.log(`[${parent}] ERROR: Could not load '${workerPath}' as a child - check the file exists`);
                } else {
                    console.log(e);
                    // const parentRef = actorRef(parent);
                    // const parentActor = this.register[parent];
                    // const {message, filename, lineno} = e;
                    // const outgoingMessage = {
                    //     type: MessageTypes.ChildError,
                    //     message: {
                    //         ref: actorRef(address),
                    //         error: {message, filename, lineno},
                    //     },
                    //     sender: parentRef,
                    //     messageID: uuid(),
                    // };
                    // todo: where to propagate errors
                }
            };
            w.onmessage = (e) => {
                if (!this.register.has(address)) {
                    return;
                }

                const data: Message = e.data;

                switch(data.type) {
                    case MessageTypes.PostStart: {
                        this.register.get(address).status = ActorStatus.Online;
                        break;
                    }
                    case MessageTypes.Outgoing: {
                        this.responses.next(data);
                        break;
                    }
                    case MessageTypes.Send: {

                        const data: SendMessage = e.data;
                        const targetActor = this.register.get(data.message.target.address);
                        const originalAckId = data.messageID;

                        /**
                         * Send the message
                         */
                        if (targetActor && targetActor.status !== ActorStatus.Errored) {
                            const messageID = uuid();
                            const m: Message = {
                                sender: actorRef(address),
                                type: MessageTypes.Incoming,
                                messageID: messageID,
                                message: data.message.payload,
                            };

                            targetActor.mailbox.next(m);

                            this.responses
                                .filter((x: Message) => x.type === MessageTypes.Outgoing)
                                .filter((x: OutgoingMessage) => x.message.responseID === messageID)
                                .pluck('message')
                                .take(1)
                                .do(x => {
                                    const ackid = uuid();
                                    const m: Message = {
                                        sender: actorRef(address),
                                        type: MessageTypes.Ack,
                                        messageID: ackid,
                                        message: {
                                            responseID: originalAckId,
                                            payload: x.payload,
                                        },
                                    };
                                    w.postMessage(m);
                                })
                                .subscribe()
                        }


                        // /**
                        //  * Send an ack to the sender
                        //  */

                        break;
                    }
                    case MessageTypes.CreateChildActor: {
                        const message: CreateChildActorMessage = data;
                        const {name, workerPath, parent} = message.message;
                        /**
                         * {
                              "type": "@@CreateChildActor",
                              "message": {
                                "workerPath": "worker-child.js",
                                "parent": {
                                  "address": "/system/82cc15bd-f4e0-44c7-83dd-e511b59cf794"
                                },
                                "name": "a5cadb99-62cb-433d-a0af-b39b4617d7a6"
                              },
                              "sender": {
                                "address": "/system/82cc15bd-f4e0-44c7-83dd-e511b59cf794"
                              },
                              "messageID": "c8ad06c4-449f-4c5d-9204-b2caf023a7c0"
                            }
                         */
                        this.actorOf(workerPath, name, parent.address);
                        break;
                    }
                }
            };

            const mailbox$ = new Subject();
            const mailboxForwarderSubscription = mailbox$
                .do(x => {
                    const actor = this.register.get(address);
                    const status = actor.status;
                    if (validStates.has(status)) {
                        // console.log('ye', status)
                        w.postMessage(x);
                    } else {
                        console.log(`[${address}] skipped --- status: ${status}`);
                    }
                })
                .subscribe();

            this.register.set(address, {
                type: ActorTypes.Worker,
                status: ActorStatus.Pending,
                ref: {address},
                worker: w,
                mailbox: mailbox$,
                mailboxForwarderSubscription,
                parent: actorRef(parent),
                workerPath,
            });

            return {
                address
            };
        }
    }
}
