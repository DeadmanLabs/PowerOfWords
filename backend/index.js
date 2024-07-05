const express = require('express');
const https = require('https');
const fs = require('fs');
const socketio = require('socket.io');
const multer = require('multer');
const path = require('path');
const whisper = require('whisper-node');

const privateKey = fs.readFileSync('./sslcert/key.pem', 'utf8');
const certificate = fs.readFileSync('./sslcert/cert.pem', 'utf8');
const credentials = { key: privateKey, cert: certificate };

const app = express();
const server = https.createServer(credentials, app);
const io = socketio(server);

app.use(express.json());

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});
const upload = multer({ storage });

if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

const transcribe = async (audioPath) => {
    const transcript = await whisper(audioPath, {
        modelName: "medium",
        whisperOptions: {
            language: 'auto',
            gen_file_txt: false,
            gen_file_subtitle: false,
            gen_file_vtt: false,
            word_timestamps: true
        }
    });
    return transcript;
}

app.get('/files', (req, res) => {
    return res.status(200).json({});
});

app.post('/audio', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ reason: "No file attached!" });
    }
    return res.status(200).json({ status: "success" });
});

io.on('connection', (socket) => {
    
    const interval = setInterval(() => {
        socket.emit('update', {
            file: '',
            completed: Math.floor(Math.random() * 100);
            time: new Date().toLocaleTimeString()
        });
    }, 1000);

    socket.on('disconnect', () => {
        clearInterval(interval);
        console.log('Client disconnected');
    })
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})