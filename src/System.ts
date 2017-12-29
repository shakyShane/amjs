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
        PreStart = '@@PreStart',
        PostStart = '@@PostStart',
        Incoming = '@@Incoming',
        Outgoing = '@@Outgoing',
        Response = '@@Response',
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
    export type OutgoingMessage = Message<MessageOutgoingType>
    export enum ActorStatus {
        Pending = '@@Pending',
        Online = '@@Online'
    }
    export interface ActorRegisterEntry {
        status: ActorStatus,
        ref: ActorRef,
        worker: Worker,
        mailbox: any,
        mailboxForwarderSubscription: any,
    }
    export function actorRef(address: string): ActorRef {
        return {address};
    }
    export class ActorSystem {
        public address = '/system';
        public register: {[address: string]: ActorRegisterEntry} = {};
        public responses = new Subject();
        constructor(public opts: string) {}

        /**
         * @param {amjs.ActorRef} ref
         * @param message
         * @returns {Promise<any>}
         */
        public send(ref: ActorRef, message: any): Promise<any> {
            const actor = this.register[ref.address];
            const messageID = uuid();
            const m: Message = {
                sender: actorRef(this.address),
                type: MessageTypes.Incoming,
                messageID,
                message,
            };
            actor.mailbox.next(m);
            return this.responses
                // .do(x => console.log(messageID, x.messageID))
                .filter((x: Message) => x.type === MessageTypes.Outgoing)
                .filter((x: OutgoingMessage) => x.message.respID === messageID)
                .pluck('message')
                .take(1)
                .toPromise();
        }

        /**
         * @param {string} workerPath
         * @param {any} name
         * @returns {amjs.ActorRef}
         */
        public actorOf (workerPath: string, name = uuid()): ActorRef {
            const address = [this.address, name].join('/');
            const w = new Worker(workerPath);
            const m: Message = {
                type: MessageTypes.PreStart,
                message: {address},
                sender: actorRef(this.address),
                messageID: uuid()
            };
            w.postMessage(m);
            w.onmessage = (e) => {
                if (this.register[address]) {
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
                    }
                }
            };
            const mailbox$ = new Subject();
            const mailboxForwarderSubscription = mailbox$
                .do(x => w.postMessage(x))
                .subscribe();

            this.register[address] = {
                status: ActorStatus.Pending,
                ref: {address},
                worker: w,
                mailbox: mailbox$,
                mailboxForwarderSubscription,
            };

            return {
                address
            };
        }
    }
}
