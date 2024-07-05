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
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./index");
(function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const transcript = yield (0, index_1.whisper)(
            // "/Users/Shared/twospeak_clip.wav",
            "/Users/Shared/mando.wav", {
                // modelPath: "/Users/Shared/custom-models/ggml-base.en.bin",
                modelName: "base",
                whisperOptions: {
                    language: 'auto',
                    // word_timestamps: true,
                    timestamp_size: 10
                }
            });
            console.log("transcript", transcript);
        }
        catch (error) {
            console.log("ERROR", error);
        }
    });
})();
//# sourceMappingURL=test.js.map