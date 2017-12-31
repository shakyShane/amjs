importScripts('/dist/browser.js');
amjs.addWorker(function Pong(address, context) {
    return {
        receive({message}, {respond, state}) {
            respond('pong!');
        }
    }
});
