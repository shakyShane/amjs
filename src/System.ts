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
    export interface MessageOutgoingType {
        payload: any,
        respID: Address,
        target: ActorRef
    }
    export interface SendMessageType {
        payload: any,
        target: ActorRef
    }
    export interface MessageCreateChildType {
        workerPath: WorkerPath,
        parent: ActorRef,
        name: string
    }
    export type StopMessage = Message<MessageTypes.Stop>
    export type OutgoingMessage = Message<MessageOutgoingType>
    export type SendMessage = Message<SendMessageType>
    export type CreateChildActorMessage = Message<MessageCreateChildType>
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
        public register: {[address: string]: ActorRegisterEntry} = {};
        public responses = new Subject();
        constructor(public address: string, public opts: string) {

            const mailbox$ = new Subject();
            const mailboxForwarderSubscription = mailbox$
                .filter((x: Message) => x.type === MessageTypes.ChildError)
                .pluck('message')
                .do(x => {
                    const actor = this.register[x.ref.address];
                    actor.status = ActorStatus.Errored;
                    this.actorOf(actor.workerPath, actor.ref.address, actor.parent.address);
                })
                .subscribe();

            this.register[address] = {
                type: ActorTypes.System,
                status: ActorStatus.Pending,
                ref: {address},
                mailbox: mailbox$,
                mailboxForwarderSubscription,
            };
        }

        static stopMessage(address: string): StopMessage {
            const messageID = uuid();
            return {
                sender: actorRef(address),
                type: MessageTypes.Incoming,
                messageID,
                message: MessageTypes.Stop,
            };
        }

        public stop(ref: ActorRef): MessageID {
            const actor = this.register[ref.address];
            const message = ActorSystem.stopMessage(ref.address);
            actor.mailbox.next(message);
            return message.messageID;
        }

        public stopAndWait(ref: ActorRef): MessageID {
            const actor = this.register[ref.address];
            const messageID = this.stop(ref);
            return this.responses
                .filter((x: Message) => x.type === MessageTypes.Outgoing)
                .filter((x: OutgoingMessage) => x.message.respID === messageID)
                .do(() => actor.status = ActorStatus.Stopped)
                .pluck('message')
                .take(1)
                .toPromise();
        }

        private _send(ref: ActorRef, message: any): MessageID {
            const actor = this.register[ref.address];
            const messageID = uuid();
            const m: Message = {
                sender: actorRef(this.address),
                type: MessageTypes.Incoming,
                messageID,
                message,
            };
            actor.mailbox.next(m);
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

        static notOnlineMessage(actor): Message {
            // todo: standard error format for these types of errors
            return {
                type: MessageTypes.Outgoing,
                message: {
                    payload: 'error',
                    reason: 'Actor not online or pending'
                },
                sender: actor.parent,
                messageID: uuid()
            };
        }


        /**
         * @param {amjs.ActorRef} ref
         * @param message
         * @returns {Promise<any>}
         */
        public sendAndWait(ref: ActorRef, message: any): Promise<any> {
            const actor = this.register[ref.address];

            if (!validStates.has(actor.status)) {
                return Promise.resolve(ActorSystem.notOnlineMessage(actor).message);
            }

            const messageID = this._send(ref, message);
            return this.responses
                .filter((x: Message) => x.type === MessageTypes.Outgoing)
                .filter((x: OutgoingMessage) => {
                    console.log('x.message', x.message);
                    return x.message.respID === messageID;
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
                if (!this.register[address]) {
                    return;
                }

                const data: Message = e.data;

                switch(data.type) {
                    case MessageTypes.PostStart: {
                        this.register[address].status = ActorStatus.Online;
                        break;
                    }
                    case MessageTypes.Outgoing: {
                        this.responses.next(data);
                        break;
                    }
                    case MessageTypes.Send: {
                        const data: SendMessage = e.data;
                        const targetActor = this.register[data.message.target.address];
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
                            // console.log('messageID', data.messageID);
                            targetActor.mailbox.next(m);
                            this.responses
                            // .do(x => console.log(messageID, x.messageID))
                                .filter((x: Message) => x.type === MessageTypes.Outgoing)
                                .filter((x: OutgoingMessage) => x.message.respID === messageID)
                                .pluck('message')
                                .take(1)
                                .do(x => {
                                    const ackid = uuid();
                                    const m: Message = {
                                        sender: actorRef(address),
                                        type: MessageTypes.Ack,
                                        messageID: ackid,
                                        message: {
                                            respID: originalAckId,
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
                    const actor = this.register[address];
                    const status = actor.status;
                    if (validStates.has(status)) {
                        // console.log('ye', status)
                        w.postMessage(x);
                    } else {
                        console.log(`[${address}] skipped --- status: ${status}`);
                    }
                })
                .subscribe();

            this.register[address] = {
                type: ActorTypes.Worker,
                status: ActorStatus.Pending,
                ref: {address},
                worker: w,
                mailbox: mailbox$,
                mailboxForwarderSubscription,
                parent: actorRef(parent),
                workerPath,
            };

            return {
                address
            };
        }
    }
}
