declare var __webpack_public_path__;
declare var importScripts;
declare var amjs;
importScripts(__webpack_public_path__ + 'amjs.js');

amjs.addWorker(function WorkerParent(address, {actorOf, actorSelection, stopAndWait, sendAndWait}) {
    return {
        async receive({message, sender}, {respond}) {
            const a1 = actorOf(__webpack_public_path__ + 'child.worker.js', 'child');
            const a2 = actorOf(__webpack_public_path__ + 'child.worker.js', 'child');
            const r1 = await sendAndWait(a1, 'error');
            const r2 = await sendAndWait(a2, 'get beers!');
            //
            respond([r1, r2]);
            // const beers = await fetch('https://api.punkapi.com/v2/beers');
            // const json = await beers.json();
            // respond(json);
        }
    }
});
