const {createSystem, send} = amjs;

main();

async function main() {
    const system = createSystem();
    const actorRef = system.actorOf('worker-parent.js', 'parent');
    const {payload} = await system.sendAndWait(actorRef, 'spawn children');

    system.stop(actorRef);
}


