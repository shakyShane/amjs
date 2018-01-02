importScripts('/dist/browser.js');
amjs.addWorker(function WorkerParent(address, {actorOf, send, stop, sendAndWait, stopAndWait}) {
    let child;
    return {
        async receive({message, sender}, {respond}) {
            if (message === 'spawn children') {
                child = actorOf('worker-stop-child.js', 'child');
                respond('ok');
            }
            if (message === 'stop children') {
                console.log(sender);
                const {payload} = await stopAndWait(child);
                respond(payload);
            }
        }
    }
});
