const {createSystem, send} = amjs;

main();

async function main() {
    const system = createSystem();
    const actorRef = system.actorOf('worker-stop-parent.js', 'parent');
    const first = await system.sendAndWait(actorRef, 'spawn children');
    const stopped = await system.stopAndWait(actorRef);
    setTimeout(async () => {
        try {
            const output = await system.sendAndWait(actorRef, 'soemthing else');
            console.log(output);
        } catch(e) {
            console.log('after');
        }
    }, 1000);
}
