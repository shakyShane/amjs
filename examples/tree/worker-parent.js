importScripts('/dist/browser.js');
amjs.addWorker(function WorkerParent(address, {actorOf, send}) {
    let child;
    return {
        type: 'supervisor',
        initialState: {
            count: 0,
        },
        async receive({message}, {respond, state}) {
            console.log(`[parent] receive() --- Address: ${address}`, message);
            if (message === 'children') {
                child = actorOf('worker-child.js', 'child');
                const resps = await Promise.all([
                    send(child, 'Hi!'),
                    send(child, 'Hi!'),
                    send(child, 'Hi!'),
                    send(child, 'Hi!'),
                ]);
                console.log(resps);
            }
            // throw new Error('Ooops!');
            // console.log('received', message);
        },
        postStart() {
            console.log(`[parent] postStart() --- Address: ${address}`);
        }
    }
}, addEventListener, postMessage);
