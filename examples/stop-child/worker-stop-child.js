importScripts('/dist/browser.js');
amjs.addWorker(function WorkerChild(address, context) {
    return {
        receive({message, sender}, {respond}) {
            if (message === '@@Stop') {
                respond('Child stopped!');
            } else {
                console.log('got a regular message', message);
            }
        }
    }
});
