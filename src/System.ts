const uuid = require('uuid/v4');
const {Subject} = require('rxjs/Subject');
namespace amjs {
    export interface ActorRef {
        address: Address
    }
    export enum MessageTypes {
        PreStart = '@@PreStart',
        PostStart = '@@PostStart',
        Incoming = '@@Incoming',
        Response = '@@Response',
    }
    export enum ActorStatus {
        Pending = '@@Pending',
        Online = '@@Online'
    }
    export interface ActorRegisterEntry {
        status: ActorStatus,
        ref: ActorRef,
        worker: Worker,
    }
    export function actorRef(address: string): ActorRef {
        return {address};
    }
    export class ActorSystem {
        public address = '/system';
        public register: {[address: string]: ActorRegisterEntry} = {};
        public responses = new Subject();
        constructor(public opts: string) {

        }
        public send(ref: ActorRef, message: any): Promise<any> {
            const actor = this.register[ref.address];
            const messageId = uuid();
            if (actor && actor.status === ActorStatus.Online) {
                const m: Message = {
                    type: Incoming,
                    messageID: messageId,
                    message,
                    sender: actorRef(this.address)
                };
                actor.worker.postMessage(m);
                return this.responses.filter((x: Message) => x.messageID === messageId)
                    .take(1).toPromise();
            }
            return Promise.reject();
        }
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
                        }
                        case MessageTypes.Response: {
                            this.responses.next(data);
                        }
                    }
                }
            };
            this.register[address] = {
                status: ActorStatus.Pending,
                ref: {address},
                worker: w,
            };
            return {
                address
            };
        }
    }
}