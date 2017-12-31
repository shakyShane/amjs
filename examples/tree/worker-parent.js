importScripts('/dist/browser.js');
amjs.addWorker(function WorkerParent(address, {actorOf, send, sendAndWait}) {
    let child;
    return {
        initialState: {
            count: 0,
        },
        async receive({message}, {respond, state, sender}) {
            if (message === 'spawn children') {
                child = actorOf('worker-child.js', 'child');
                const resp = await Promise.all([
                    sendAndWait(child, 100),
                    sendAndWait(child, 200),
                    sendAndWait(child, 300),
                    sendAndWait(child, 400),
                ]);
                respond(resp.map(x => x.payload));
            }
        },
        postStart() {
            // console.log(`[parent] postStart() --- Address: ${address}`);
        }
    }
});
