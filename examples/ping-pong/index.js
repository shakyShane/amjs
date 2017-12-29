const {createSystem, send} = amjs;
const system = createSystem();
const actorRef = system.actorOf('worker-1.js');

run();

async function run() {

    const out = await Promise.all([
        system.send(actorRef, 'ping 1!'),
        system.send(actorRef, 'ping 2!'),
        system.send(actorRef, 'ping 3!'),
    ]);

    out.forEach((resp, index) => {
        console.log(resp.payload, index);
    });
}
