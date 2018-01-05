importScripts('/dist/browser.js');
amjs.addWorker(function WorkerChild(address, {actorOf, stopAndWait, actorSelection}) {
    return {
        async receive({message, sender}, {respond}) {
            if (message === '@@Stop') {
                const children = await actorSelection('*');
                const allDone = await Promise.all(children.map(child => stopAndWait({address: child})));
                respond(allDone);
            } else {
                console.log('got a regular message', message);
            }
        },
        postStart() {
            actorOf('worker-child2.js');
        }
    }
});
