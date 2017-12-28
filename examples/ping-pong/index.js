const {createSystem, send} = amjs;
const system = createSystem();
const actorRef = system.actorOf('worker-1.js');

run();

async function run() {
    console.log('here');
    console.log(actorRef);
    setTimeout(() => {
        console.log(system.register[actorRef.address].status);
    }, 100)
    // console.log('sent!');
}
