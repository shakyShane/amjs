const {createSystem, send} = amjs;

function debug(json) {
    // console.log(document.getElementsByTagName('code'))
    document.querySelector('#debug').innerHTML += '\n' + JSON.stringify(json, null, 2);
}

main();

async function main() {
    const system = createSystem();
    const actorRef = system.actorOf('worker-stop-parent.js', 'parent');
    const first = await system.sendAndWait(actorRef, 'spawn children');
    debug(first);
    system.send(actorRef, 'stop children');
}
