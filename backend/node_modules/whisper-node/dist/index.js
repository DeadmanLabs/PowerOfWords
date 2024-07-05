"use strict";
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
exports.whisper = void 0;
const path_1 = __importDefault(require("path"));
const shell_1 = __importDefault(require("./shell"));
const whisper_1 = require("./whisper");
const tsToArray_1 = __importDefault(require("./tsToArray"));
// returns array[]: {start, end, speech}
const whisper = (filePath, options) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("[whisper-node] Transcribing:", filePath, "\n");
        // todo: combine steps 1 & 2 into sepparate function called whisperCpp (createCppCommand + shell)
        // 1. create command string for whisper.cpp
        const command = (0, whisper_1.createCppCommand)({
            filePath: path_1.default.normalize(filePath),
            modelName: options === null || options === void 0 ? void 0 : options.modelName,
            modelPath: options === null || options === void 0 ? void 0 : options.modelPath,
            options: options === null || options === void 0 ? void 0 : options.whisperOptions
        });
        // 2. run command in whisper.cpp directory 
        // todo: add return for continually updated progress value
        const transcript = yield (0, shell_1.default)(command, options === null || options === void 0 ? void 0 : options.shellOptions);
        // 3. parse whisper response string into array
        const transcriptArray = (0, tsToArray_1.default)(transcript);
        return transcriptArray;
    }
    catch (error) {
        console.log("[whisper-node] Problem:", error);
    }
});
exports.whisper = whisper;
exports.default = exports.whisper;
//# sourceMappingURL=index.js.map