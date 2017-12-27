namespace amjs {
    export class System {
        constructor(public opts: string) {}
    }
    export function createSystem(opts: string) {
        return new System(opts);
    }
}