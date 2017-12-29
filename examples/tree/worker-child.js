importScripts('/dist/browser.js');
amjs.addWorker(function WorkerChild(address, context) {
    let child;
    return {
        initialState: {
            count: 0,
        },
        receive({message}, {respond, state}) {
            console.log('[child] receive()', message);
        },
        postStart() {
            console.log('[child] postStart()');
            // child = context.actorOf('worker-child.js');
        }
    }
}, addEventListener, postMessage);
