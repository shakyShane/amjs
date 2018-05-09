import {ActorSystem} from "./System";

export function createSystem(address = '/system', opts?): ActorSystem {
    const defaults = {}
    const options = {
        ...defaults,
        ...opts
    };
    return new ActorSystem(address, options);
}
