importScripts('/dist/browser.js');
amjs.addWorker(function WorkerChild(address, {actorOf}) {
    return {
        receive({message, sender}, {respond}) {
            if (message === '@@Stop') {
                respond('Child stopped!');
            } else {
                console.log('got a regular message', message);
            }
        },
        postStart() {
            actorOf('worker-child2.js');
        }
    }
});
