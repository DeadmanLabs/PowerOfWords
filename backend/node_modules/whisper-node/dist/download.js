#! /usr/bin/env node
"use strict";
// Javascript layer for using the whisper.cpp built-in model downloader scripts 
//
// npx whisper-node download
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const shelljs_1 = __importDefault(require("shelljs"));
const readline_sync_1 = __importDefault(require("readline-sync"));
const constants_1 = require("./constants");
const MODELS_LIST = [
    "tiny",
    "tiny.en",
    "base",
    "base.en",
    "small",
    "small.en",
    "medium",
    "medium.en",
    "large-v1",
    "large"
];
const askModel = () => __awaiter(void 0, void 0, void 0, function* () {
    const answer = yield readline_sync_1.default.question(`\n[whisper-node] Enter model name (e.g. 'base.en') or 'cancel' to exit\n(ENTER for base.en): `);
    if (answer === "cancel") {
        console.log("[whisper-node] Exiting model downloader. Run again with: 'npx whisper-node download'");
        process.exit(0);
    }
    // user presses enter
    else if (answer === "") {
        console.log("[whisper-node] Going with", constants_1.DEFAULT_MODEL);
        return constants_1.DEFAULT_MODEL;
    }
    else if (!MODELS_LIST.includes(answer)) {
        console.log("\n[whisper-node] FAIL: Name not found. Check your spelling OR quit wizard and use custom model.");
        // re-ask question
        return yield askModel();
    }
    return answer;
});
function downloadModel() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // shell.exec("echo $PWD");
            shelljs_1.default.cd(constants_1.NODE_MODULES_MODELS_PATH);
            console.log(`
| Model     | Disk   | RAM     |
|-----------|--------|---------|
| tiny      |  75 MB | ~390 MB |
| tiny.en   |  75 MB | ~390 MB |
| base      | 142 MB | ~500 MB |
| base.en   | 142 MB | ~500 MB |
| small     | 466 MB | ~1.0 GB |
| small.en  | 466 MB | ~1.0 GB |
| medium    | 1.5 GB | ~2.6 GB |
| medium.en | 1.5 GB | ~2.6 GB |
| large-v1  | 2.9 GB | ~4.7 GB |
| large     | 2.9 GB | ~4.7 GB |
`);
            // ensure running in correct path
            if (!shelljs_1.default.which("./download-ggml-model.sh")) {
                throw "whisper-node downloader is not being run from the correct path! cd to project root and run again.";
            }
            const modelName = yield askModel();
            // default is .sh
            let scriptPath = "./download-ggml-model.sh";
            // windows .cmd version
            if (process.platform === 'win32')
                scriptPath = "download-ggml-model.cmd";
            shelljs_1.default.exec(`${scriptPath} ${modelName}`);
            // TODO: add check in case download-ggml-model doesn't return a successful download.
            // to prevent continuing to compile; that makes it harder for user to see which script failed.
            console.log("[whisper-node] Attempting to compile model...");
            // move up directory, run make in whisper.cpp
            shelljs_1.default.cd("../");
            // this has to run in whichever directory the model is located in??
            shelljs_1.default.exec("make");
            process.exit(0);
        }
        catch (error) {
            console.log("ERROR Caught in downloadModel");
            console.log(error);
            return error;
        }
    });
}
exports.default = downloadModel;
// runs after being called in package.json
downloadModel();
//# sourceMappingURL=download.js.map