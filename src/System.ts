/* @internal */
namespace amjs {
    class System {
        constructor(public opts) {}
    }
    export function createSystem(opts) {
        return new System(opts);
    }
}