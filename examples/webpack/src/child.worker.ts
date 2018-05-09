importScripts(__webpack_public_path__ + 'amjs.js');

amjs.addWorker(function WorkerParent(address, {actorOf, actorSelection, stopAndWait, sendAndWait}) {
    return {
        async receive({message, sender}, {respond}) {
            if (message === 'error') {
                throw new Error('Ooops!');
            } else {
                const beers = await fetch('https://api.punkapi.com/v2/beers');
                const json = await beers.json();
                respond(json);
            }
        }
    }
});
