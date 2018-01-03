importScripts('/dist/browser.js');
amjs.addWorker(function WorkerParent(address, {actorOf, actorSelection, stopAndWait}) {
    return {
        async receive({message, sender}, {respond}) {
            if (message === 'spawn children') {
                actorOf('worker-child.js', 'child-01');
                respond('ok');
            }
            if (message === 'stop children') {
                const children = await actorSelection('*');
                console.log(children);
                // const {payload} = await stopAndWait(children[0]);
                // respond(payload);
            }
        }
    }
});
