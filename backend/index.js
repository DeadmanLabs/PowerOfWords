const express = require('express');
const https = require('https');
const http = require('http');
const fs = require('fs');
const socketio = require('socket.io');
const multer = require('multer');
const path = require('path');
const { WebSocketServer } = require('ws');
const { execFile, spawn } = require('child_process');
const { Configuration, OpenAIApi } = require('openai');
const ffmpeg = require('fluent-ffmpeg');
const cors = require('cors');
const crypto = require('crypto');
const process = require('process');
const { OpenAI } = require('langchain/llms/openai');
const { TextLoader } = require('langchain/document_loaders/fs/text');
const { SummarizationChain } = require('langchain/chains');


const privateKey = fs.readFileSync('./sslcert/key.pem', 'utf8');
const certificate = fs.readFileSync('./sslcert/cert.pem', 'utf8');
const credentials = { key: privateKey, cert: certificate };

const app = express();
//const server = https.createServer(credentials, app);
const server = http.createServer(app);
const io = socketio(server, {
    cors: {
        origin: "*"
    }
});

app.use(express.json());
app.use(cors());

const tempStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'temp/');
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});
const upload = multer({ storage: tempStorage });

if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

if (!fs.existsSync('temp')) {
    fs.mkdirSync('temp');
}

if (!fs.existsSync('transcriptions')) {
    fs.mkdirSync('transcriptions');
}

// Serve static files from the transcriptions directory
app.use('/transcriptions', express.static(path.join(__dirname, 'transcriptions')));

// OpenAI API configuration
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Function to compute file hash
const computeFileHash = (filePath) => {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(filePath);
        stream.on('data', (data) => hash.update(data));
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', (err) => reject(err));
    });
};

// Function to check if a hash exists in the uploads directory
const hashExists = async (hash) => {
    const files = fs.readdirSync('uploads');
    for (const file of files) {
        const filePath = path.join('uploads', file);
        const fileHash = await computeFileHash(filePath);
        console.log(`Comparing ${hash} with ${fileHash}`);
        if (fileHash === hash) {
            return true;
        }
    }
    return false;
};

app.post('/audio', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ reason: "No file attached!" });
    }

    const tempFilePath = path.join(__dirname, 'temp', req.file.filename);
    const finalFilePath = path.join(__dirname, 'uploads', req.file.filename);

    try {
        const fileHash = await computeFileHash(tempFilePath);
        console.log(`Computed hash for uploaded file: ${fileHash}`);
        if (await hashExists(fileHash)) {
            // Delete the uploaded file if it's a duplicate
            fs.unlinkSync(tempFilePath);
            return res.status(409).json({ reason: "Duplicate file detected!" });
        }

        // Move the file from temp to uploads directory
        fs.renameSync(tempFilePath, finalFilePath);

        const duration = await getAudioDuration(finalFilePath);
        console.log(`Audio duration: ${duration} seconds`);

        // Respond to the client with the file information and duration
        return res.status(200).json({ status: "success", duration, filePath: finalFilePath });
    } catch (error) {
        console.error('Error processing file:', error);
        if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
        }
        return res.status(500).json({ reason: "Failed to process file" });
    }
});

// Function to get audio duration using ffprobe
const getAudioDuration = (filePath) => {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
            if (err) {
                reject(err);
            } else {
                resolve(metadata.format.duration);
            }
        });
    });
};

// Function to convert audio to 16 kHz WAV
const convertToWav = (inputPath, outputPath) => {
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .audioCodec('pcm_s16le')
            .audioFrequency(16000)
            .toFormat('wav')
            .on('end', () => resolve(outputPath))
            .on('error', (err) => reject(err))
            .save(outputPath);
    });
};

// Function to transcribe a file using whisper.cpp
const transcribeFile = async (filePath, clientId) => {
    try {
        // Convert to 16 kHz WAV if necessary
        const wavFilePath = filePath.replace(/\.[^/.]+$/, ".wav");
        await convertToWav(filePath, wavFilePath);

        // Get total duration of the audio file
        const totalDuration = await getAudioDuration(wavFilePath); // Duration in seconds

        return new Promise((resolve, reject) => {
            const commandPath = path.resolve(__dirname, 'whisper.cpp');
            const command = path.join(commandPath, 'main.exe');
            const args = [
                '-m', path.resolve(__dirname, 'whisper.cpp', 'models', 'ggml-medium.en.bin'),
                '-f', wavFilePath,
                '-otxt',
                '--print-progress' // Optional, since we are parsing the transcription output
            ];

            // Clone the current environment and extend the PATH
            const env = { ...process.env };
            env.PATH = `${process.env.PATH};${commandPath};${path.resolve(__dirname, 'models')}`;

            // Set the current working directory to where main.exe is located
            const options = {
                env: env,
                cwd: commandPath,
                shell: false
            };

            const child = spawn(command, args, options);

            child.stdout.setEncoding('utf8'); // Ensure the data is in string format
            let buffer = ''; // Buffer to hold incomplete lines

            child.stdout.on('data', (data) => {
                buffer += data;
                let lines = buffer.split('\n');

                // Keep the last incomplete line in the buffer
                buffer = lines.pop();

                for (const line of lines) {
                    // Parse each line to extract the timestamp
                    const timestampMatch = line.match(/\[(\d{2}:\d{2}:\d{2}\.\d{3})\s+-->.*\]/);
                    if (timestampMatch) {
                        const currentTimeString = timestampMatch[1]; // e.g., '00:02:24.000'
                        const currentTimeSeconds = timeStringToSeconds(currentTimeString);

                        // Calculate progress percentage
                        const progress = Math.min((currentTimeSeconds / totalDuration) * 100, 100).toFixed(2);

                        // Emit progress to the client
                        io.emit('transcription_progress', { progress: parseFloat(progress) });

                        console.log(`Transcription progress: ${progress}%`);
                    }

                    // Optionally, you can also emit the transcribed text to the client
                    const transcriptionMatch = line.match(/\[.*\]\s+(.*)/);
                    if (transcriptionMatch) {
                        const transcribedText = transcriptionMatch[1];
                        io.to(clientId).emit('transcription_text', { text: transcribedText });
                    }
                }
            });

            child.stderr.on('data', (data) => {
                // Handle any errors or additional messages
                console.error(`stderr: ${data}`);
            });

            child.on('error', (error) => {
                console.error(`Spawn error: ${error}`);
                reject(error);
            });

            child.on('close', async (code) => {
                if (code !== 0) {
                    console.error(`Child process exited with code ${code}`);
                    reject(new Error(`Process exited with code ${code}`));
                } else {
                    console.log('Transcription completed successfully.');
                    // Move the transcription file to the transcriptions folder
                    const transcriptionFilePath = filePath.replace('uploads', 'transcriptions').replace(/\.[^/.]+$/, ".txt");
                    const transcriptionTempPath = wavFilePath + ".txt";

                    // Check if the transcription file exists before moving it
                    if (fs.existsSync(transcriptionTempPath)) {
                        fs.renameSync(transcriptionTempPath, transcriptionFilePath.replace(/\.[^/.]+$/, ".txt"));
                        // Delete the temporary WAV file
                        fs.unlinkSync(wavFilePath);
                        resolve();
                    } else {
                        reject(new Error(`Transcription file not found: ${transcriptionTempPath}`));
                    }
                }
            });
        });
    } catch (error) {
        console.error('Error in transcribeFile:', error);
        throw error;
    }
};

// Helper function to convert time string to seconds
const timeStringToSeconds = (timeString) => {
    const [hours, minutes, rest] = timeString.split(':');
    const [seconds, milliseconds] = rest.split('.');
    return (
        parseInt(hours, 10) * 3600 +
        parseInt(minutes, 10) * 60 +
        parseInt(seconds, 10) +
        parseInt(milliseconds, 10) / 1000
    );
};

// Endpoint to fetch files and their transcription status
app.get('/files', (req, res) => {
    try {
        if (!fs.existsSync('uploads')) {
            fs.mkdirSync('uploads');
        }

        if (!fs.existsSync('transcriptions')) {
            fs.mkdirSync('transcriptions');
        }

        const files = fs.readdirSync('uploads');
        const transcriptions = fs.readdirSync('transcriptions');
        const fileStatus = files.map(file => {
            const transcriptionFile = file.replace(/\.[^/.]+$/, ".txt");
            return {
                file,
                hasTranscription: transcriptions.includes(transcriptionFile)
            };
        });
        res.json(fileStatus);
    } catch (error) {
        console.error('Error fetching files:', error);
        res.status(500).json({ reason: "Failed to fetch files" });
    }
});

// Transcribe all untranscribed files
app.post('/transcribe-all', async (req, res) => {
    const files = fs.readdirSync('uploads');
    const transcriptions = fs.readdirSync('transcriptions');
    const untranscribedFiles = files.filter(file => {
        const transcriptionFile = file.replace(/\.[^/.]+$/, ".txt");
        return !transcriptions.includes(transcriptionFile);
    });

    for (const file of untranscribedFiles) {
        const filePath = path.join(__dirname, 'uploads', file);
        const transcriptionPath = path.join(__dirname, 'transcriptions', file.replace(/\.[^/.]+$/, ".txt"));
        await transcribeFile(filePath, transcriptionPath);
    }

    res.status(200).json({ status: "success" });
});

// Summarize endpoint
app.post('/summarize', async (req, res) => {
    const { files } = req.body;
    if (!files || !Array.isArray(files) || files.length === 0) {
        return res.status(400).json({ reason: "No files provided for summarization" });
    }

    try {
        const fileContents = files.map(file => {
            const filePath = path.join(__dirname, 'transcriptions', file);
            return fs.readFileSync(filePath, 'utf8');
        });

        const combinedText = fileContents.join('\n\n');

        // Use Langchain.js to generate the summary
        const loader = new TextLoader(combinedText);
        const chain = new SummarizationChain(openai, loader);

        res.writeHead(200, {
            'Content-Type': 'text/plain',
            'Transfer-Encoding': 'chunked'
        });

        chain.run().then((summary) => {
            res.write(summary);
            res.end();
        }).catch((error) => {
            console.error('Error summarizing files:', error);
            res.status(500).json({ reason: "Failed to summarize files" });
        });

    } catch (error) {
        console.error('Error summarizing files:', error);
        res.status(500).json({ reason: "Failed to summarize files" });
    }
});

io.on('connection', (socket) => {
    console.log('Client connected');

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});