namespace amjs {
    export function createSystem(address: string, opts: any): ActorSystem {
        return new ActorSystem(address, opts);
    }
}
