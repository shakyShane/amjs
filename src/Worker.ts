namespace amjs {
    export type Address = string;
    export interface Message {
        type: MessageTypes
        message: any
        messageID: string
        sender: ActorRef,
    }
    export function addWorker(factory, addEventLister, postmessage) {
        let hasInstance = false;
        let instance;
        addEventLister('message', function(e) {
            const data: Message = e.data;
            switch(data.type) {
                case MessageTypes.PreStart: {
                    if (!hasInstance) {
                        const {address} = data.message;
                        instance = new factory(address);
                        hasInstance = true;
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
                }
                case MessageTypes.Incoming: {

                }
            }
        })
    }
}