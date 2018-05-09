declare var __webpack_public_path__;
import {createSystem} from '../../../';

function debug(json) {
    // console.log(document.getElementsByTagName('code'))
    document.querySelector('#debug').innerHTML += '\n' + JSON.stringify(json, null, 2);
}

main();

async function main() {
    // console.log(Worker);
    const system = createSystem();
    const actorRef = system.actorOf(__webpack_public_path__ + 'parent.worker.js', 'parent');
    const {payload} = await system.sendAndWait(actorRef, 'get beers');

    debug(payload.length);

    // setTimeout(async () => {
    //     const second = await system.sendAndWait(actorRef, 'stop children');
    //     debug(second);
    // }, 1000);
}
