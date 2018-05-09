declare var __webpack_public_path__;
declare var importScripts;
declare var amjs;
declare module "worker-loader!*" {
    class WebpackWorker extends Worker {
        constructor();
    }

    export = WebpackWorker;
}
