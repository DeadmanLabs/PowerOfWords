"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MODELS_LIST = exports.createCppCommand = void 0;
// todo: remove all imports from file
const fs_1 = require("fs");
const constants_1 = require("./constants");
// return as syntax for whisper.cpp command
const createCppCommand = ({ filePath, modelName = null, modelPath = null, options = { "word_timestamps": true } }) => `./main ${getFlags(options)} -m ${modelPathOrName(modelName, modelPath)} -f ${filePath}`;
exports.createCppCommand = createCppCommand;
const modelPathOrName = (mn, mp) => {
    if (mn && mp)
        throw "Submit a modelName OR a modelPath. NOT BOTH!";
    else if (!mn && !mp) {
        console.log("[whisper-node] No 'modelName' or 'modelPath' provided. Trying default model:", constants_1.DEFAULT_MODEL, "\n");
        // second modelname check to verify is installed in directory
        const modelPath = `./models/${exports.MODELS_LIST[constants_1.DEFAULT_MODEL]}`;
        if (!(0, fs_1.existsSync)(modelPath)) {
            // throw `'${mn}' not downloaded! Run 'npx whisper-node download'`;
            throw `'${constants_1.DEFAULT_MODEL}' not downloaded! Run 'npx whisper-node download'\n`;
        }
        return modelPath;
    }
    // modelpath
    else if (mp)
        return mp;
    // modelname
    else if (exports.MODELS_LIST[mn]) {
        // second modelname check to verify is installed in directory
        const modelPath = `./models/${exports.MODELS_LIST[mn]}`;
        if (!(0, fs_1.existsSync)(modelPath)) {
            throw `'${mn}' not found! Run 'npx whisper-node download'`;
        }
        return modelPath;
    }
    else if (mn)
        throw `modelName "${mn}" not found in list of models. Check your spelling OR use a custom modelPath.`;
    else
        throw `modelName OR modelPath required! You submitted modelName: '${mn}', modelPath: '${mp}'`;
};
// option flags list: https://github.com/ggerganov/whisper.cpp/blob/master/README.md?plain=1#L91
// TODO: Replace with for loop that rejects all unrecognized keys
const getFlags = (flags) => {
    let s = "";
    // output files
    if (flags.gen_file_txt)
        s += " -otxt";
    if (flags.gen_file_subtitle)
        s += " -osrt";
    if (flags.gen_file_vtt)
        s += " -ovtt";
    // timestamps
    if (flags.timestamp_size && flags.word_timestamps)
        throw "Invalid option pair. Use 'timestamp_size' OR 'word_timestamps'. NOT BOTH!";
    if (flags.word_timestamps)
        s += " -ml 1"; // shorthand for timestamp_size:1
    if (flags.timestamp_size)
        s += " -ml " + String(flags.timestamp_size);
    // input language
    if (flags.language)
        s += " -l " + flags.language;
    return s;
};
// model list: https://github.com/ggerganov/whisper.cpp/#more-audio-samples
exports.MODELS_LIST = {
    "tiny": "ggml-tiny.bin",
    "tiny.en": "ggml-tiny.en.bin",
    "base": "ggml-base.bin",
    "base.en": "ggml-base.en.bin",
    "small": "ggml-small.bin",
    "small.en": "ggml-small.en.bin",
    "medium": "ggml-medium.bin",
    "medium.en": "ggml-medium.en.bin",
    "large-v1": "ggml-large-v1.bin",
    "large": "ggml-large.bin"
};
//# sourceMappingURL=whisper.js.map