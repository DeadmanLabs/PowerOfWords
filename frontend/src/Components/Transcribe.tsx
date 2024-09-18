import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

interface AudioFile {
    file: string;
    hasTranscription: boolean;
}

function Transcribe() {
    const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
    const [currentFile, setCurrentFile] = useState<string | null>(null);
    const [progress, setProgress] = useState<number>(0);
    const [time, setTime] = useState<string>('0:00');
    const [status, setStatus] = useState<string>('Idle');
    const [recording, setRecording] = useState<boolean>(false);
    const [audioDuration, setAudioDuration] = useState<number | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const socketRef = useRef<any>(null);

    const fetchAudioFiles = async () => {
        try {
            const response = await fetch('http://localhost:5000/files');
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            setAudioFiles(data);
        } catch (error) {
            console.error('Error fetching audio files:', error);
        }
    };

    useEffect(() => {
        fetchAudioFiles();
        socketRef.current = io('http://localhost:5000');
        socketRef.current.on('transcription_progress', (data: { progress: number }) => {
            console.log('Transcription progress:', data.progress);
            setProgress(data.progress);
        });
        socketRef.current.on('transcription_text', (data: { text: string }) => {
            console.log('Transcribed text:', data.text);
        });

        return () => {
            socketRef.current.disconnect();
        };
    }, []);

    const handleTranscribeClick = async () => {
        try {
            const response = await fetch('http://localhost:5000/transcribe-all', {
                method: 'POST'
            });
            if (response.ok) {
                setStatus('Processing...');
                fetchAudioFiles();
                setProgress(0);
            } else {
                console.error('Error starting transcription');
            }
        } catch (error) {
            console.error('Error starting transcription:', error);
        }
    };

    const handleRecordButtonPress = () => {
        setRecording(true);
        setStatus('Recording...');
        timerRef.current = setInterval(() => {
            setTime(prevTime => {
                const [minutes, seconds] = prevTime.split(':').map(Number);
                const totalSeconds = minutes * 60 + seconds + 1;
                const newMinutes = Math.floor(totalSeconds / 60);
                const newSeconds = totalSeconds % 60;
                return `${newMinutes}:${newSeconds < 10 ? '0' : ''}${newSeconds}`;
            });
        }, 1000);
    };

    const handleRecordButtonRelease = () => {
        setRecording(false);
        setStatus('Idle');
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            console.log('Selected file:', file);
            const audio = new Audio(URL.createObjectURL(file));
            audio.onloadedmetadata = () => {
                console.log('Audio metadata loaded');
                console.log('Audio duration:', audio.duration);
                setAudioDuration(audio.duration);
            };
            audio.onerror = (e) => {
                console.error('Error loading audio file:', e);
            };
            audio.load(); // Ensure the audio file is loaded
        }
    };

    return (
        <div className="flex flex-col items-center justify-center w-full p-4">
            <div className="w-full mb-4">
                <h2 className="text-lg font-bold mb-2">Audio Files</h2>
                <ul className="list-disc list-inside bg-white p-4 rounded-lg shadow-md">
                    {
                        audioFiles.map((file, index) => (
                            <li key={index} className="text-gray-700 flex justify-between items-center">
                                {file.file}
                                {file.hasTranscription ? (
                                    <button
                                        className="px-4 py-2 bg-green-500 text-white rounded-lg"
                                        onClick={() => window.open(`http://localhost:5000/transcriptions/${file.file.replace(/\.[^/.]+$/, ".txt")}`, '_blank')}
                                    >
                                        Download Transcription
                                    </button>
                                ) : (
                                    <button
                                        className="px-4 py-2 bg-blue-500 text-white rounded-lg"
                                        onClick={handleTranscribeClick}
                                    >
                                        Transcribe
                                    </button>
                                )}
                            </li>
                        ))
                    }
                </ul>
            </div>
            <div className="w-full mb-4">
                <button
                    onClick={fetchAudioFiles}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg w-full"
                >
                    Refresh List
                </button>
            </div>
            <div className="w-full mb-4">
                <button
                    onMouseDown={handleRecordButtonPress}
                    onMouseUp={handleRecordButtonRelease}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg w-full"
                >
                    {recording ? 'Recording...' : 'Record Audio'}
                </button>
            </div>
            <div className="w-full mb-4">
                <button
                    onClick={handleTranscribeClick}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg w-full"
                >
                    Transcribe New Audio
                </button>
            </div>
            <div className="w-full mb-4">
                <input type="file" accept="audio/*" onChange={handleFileChange} />
                {audioDuration !== null && (
                    <div className="text-gray-700 mb-2">Duration: {audioDuration.toFixed(2)} seconds</div>
                )}
            </div>
            <div className="w-full mb-4">
                {currentFile && (
                    <div className="text-gray-700 mb-2">{currentFile}</div>
                )}
                <div className="relative w-full h-8 bg-gray-200 rounded-lg">
                    <div
                        className="absolute left-0 top-0 h-full bg-blue-500 text-white text-sm flex items-center justify-center"
                        style={{ width: `${progress}%` }}
                    >
                        {progress > 0 ? `${progress.toFixed(2)}% (${time})` : status}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Transcribe;