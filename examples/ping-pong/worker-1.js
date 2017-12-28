importScripts('browser.js');
amjs.addWorker(function Pong(address) {
    return {
        receive({type, address, name} = {}, sender) {
            // switch (type) {
            //     case 'ping': {
            //         send(sender, 'pong')
            //     }
            // }
        },
        postStart() {
            // console.log('worker 1 running', address);
        }
    }
}, addEventListener, postMessage);