const express = require('express');
const https = require('https');
const fs = require('fs');
const socketio = require('socket.io');
const multer = require('multer');
const path = require('path');
const whisper = require('whisper-node');

const privateKey = fs.readFileSync('key.pem', 'utf8');
const certificate = fs.readFileSync('cert.pem', 'utf8');
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
    
}

app.get('', (req, res) => {

});

app.post('', upload.single('file'), (req, res) => {

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