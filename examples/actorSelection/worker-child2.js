importScripts('/dist/browser.js');
amjs.addWorker(function WorkerChild(address, context) {
    return {
        receive({message, sender}, {respond}) {

        },
        postStart() {}
    }
});
