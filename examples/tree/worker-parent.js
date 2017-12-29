importScripts('/dist/browser.js');
amjs.addWorker(function WorkerParent(address, context) {
    let child;
    return {
        type: 'supervisor',
        initialState: {
            count: 0,
        },
        receive({message}, {respond, state}) {
            // console.log('received', message);
        },
        postStart() {
            console.log('[parent] postStart()');
            child = context.actorOf('worker-child.js');
            // console.log(child);
        }
    }
}, addEventListener, postMessage);
