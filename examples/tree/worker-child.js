importScripts('/dist/browser.js');
amjs.addWorker(function WorkerChild(address, context) {
    let child;
    return {
        initialState: {
            count: 0,
        },
        receive({message}, {respond, state}) {
            console.log(`[child] receive() --- Address: ${address}`, message);
            respond('Hello there!');
        },
        postStart() {
            console.log(`[child] postStart() --- Address: ${address}`);
            // child = context.actorOf('worker-child.js');
        }
    }
}, addEventListener, postMessage);
