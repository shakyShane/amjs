importScripts('/dist/browser.js');
amjs.addWorker(function WorkerParent(address, {actorOf, send, stop, sendAndWait}) {
    let child;
    let running = true;
    return {
        async receive({message}, {respond, state, sender}) {
            if (message === 'spawn children') {
                child = actorOf('worker-stop-child.js', 'child');
                respond('ok');
            }
            if (message === 'stop children') {
                stop(child);
                setTimeout(() => {
                    // send(child, 'other');
                }, 1000)
            }
        },
        postStart() {
            // console.log(`[parent] postStart() --- Address: ${address}`);
        }
    }
});
