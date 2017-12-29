const {createSystem, send} = amjs;
const system = createSystem('/system', {});
const actorRef = system.actorOf('worker-parent.js', 'parent');

setTimeout(async function() {
    const res = await system.send(actorRef, 'children');
}, 1000);
