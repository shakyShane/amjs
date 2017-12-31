const system = amjs.createSystem();

run();

/**
 * Create a Web Worker, send it a message, wait for a response
 * @returns {Promise}
 */
async function run() {

    const actorRef = system.actorOf('worker-1.js');
    const {payload} = await system.sendAndWait(actorRef, 'ping!');

    console.log(payload); // pong!
}


runMulti();

/**
 * Create 3 Web Workers, send them all a message, & wait for all to respond
 * @returns {Promise}
 */
async function runMulti() {

    const refs = await Promise.all([
        system.actorOf('worker-1.js'),
        system.actorOf('worker-1.js'),
        system.actorOf('worker-1.js'),
    ].map(ref => system.sendAndWait(ref, 'ping!')));

    console.log(refs.map(x => x.payload)); // [pong!, pong!, pong!]
}



