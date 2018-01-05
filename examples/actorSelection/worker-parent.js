importScripts('/dist/browser.js');
amjs.addWorker(function WorkerParent(address, {actorOf, actorSelection, stopAndWait}) {
    return {
        async receive({message, sender}, {respond}) {
            if (message === 'spawn children') {
                actorOf('worker-child.js', 'child-01');
                actorOf('worker-child.js', 'child-02');
                actorOf('worker-child.js', 'child-03');
                actorOf('worker-child.js', 'child-04');
                actorOf('worker-child.js', 'child-05');
                respond('ok');
            }
            if (message === 'stop children') {
                const resp = (await actorSelection('*'));
                const children = resp.payload;
                const allDone = await Promise.all(children.map(child => stopAndWait({address: child})))
                respond(allDone);
            }
        }
    }
});
