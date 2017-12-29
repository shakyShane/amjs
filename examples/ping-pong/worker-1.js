importScripts('/dist/browser.js');
amjs.addWorker(function Pong(address, context) {
    return {
        initialState: {
            count: 0,
        },
        receive({message}, {respond, state}) {
            console.log('actor private state', state);
            respond('pong!', prev => {
                return {
                    ...prev,
                    count: prev.count += 1,
                }
            });
        },
        postStart() {
            // console.log('worker 1 running', address);
        }
    }
}, addEventListener, postMessage);
