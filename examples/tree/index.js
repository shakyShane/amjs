const {createSystem, send} = amjs;
const system = createSystem('/system', {});
const actorRef = system.actorOf('worker-parent.js', 'parent');
const res = system.send(actorRef, 'children');


// setTimeout(() => {
//     const res2 = system.send(actorRef, 'children2');
// }, 2000)
