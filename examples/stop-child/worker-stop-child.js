importScripts('/dist/browser.js');
amjs.addWorker(function WorkerChild(address, context) {
    let child;
    return {
        initialState: {
            count: 0,
        },
        receive({message}, {respond, state}) {
            if (message.type === '@@Stop') {
                console.log('got a stop message');
            } else {
                console.log('got a regular message', message);
            }
        },
        postStart() {
            // console.log(`[child] postStart() --- Address: ${address}`);
            // child = context.actorOf('worker-child.js');
        }
    }
});
