namespace amjs {
    // Here we expose amjs
    // so that it may be consumed easily like a node module.
    declare const module: { exports: {} };
    if (typeof module !== "undefined" && module.exports) {
        module.exports = amjs;
    }
}
