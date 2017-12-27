namespace amjs {
    export function createSystem(opts: string): ActorSystem {
        return new ActorSystem(opts);
    }
}