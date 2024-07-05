import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

function Transcribe() {
    const [audioFiles, setAudioFiles] = useState<string[]>([]);
    const [currentFile, setCurrentFile] = useState<string | null>(null);
    const [progress, setProgress] = useState<number>(0);
    const [time, setTime] = useState<string>('');
    const [status, setStatus] = useState<string>('Idle');

    const fetchAudioFiles = async () => {
        try {
            const response = await fetch('https://localhost/audio-files');
            const data = await response.json();
        } catch (error) {
            console.error('Error fetching audio files:', error);
        }
    };

    useEffect(() => {
        fetchAudioFiles();
    }, []);

    const handleTranscribeClick = () => {
        const socket = io('https://localhost/transcribe');
        socket.on('connect', () => {
            setStatus('Processing...');
        });
        socket.on('update', (data: { file: string; completed: number; time: string }) => {
            setCurrentFile(data.file);
            setProgress(data.completed);
            setTime(data.time);
        });
        socket.on('disconnect', () => {
            setStatus('Complete!');
            setProgress(0);
            setCurrentFile(null);
            setTime('');
            fetchAudioFiles();
        })
    };

    return (
        <div className="flex flex-col items-center justify-center w-full p-4">
            <div className="w-full mb-4">
                <h2 className="text-lg font-bold mb-2">Audio Files</h2>
                <ul className="list-disc list-inside bg-white p-4 rounded-lg shadow-md">
                    {
                        audioFiles.map((file, index) => (
                            <li key={index} className="text-gray-700">{file}</li>
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
                    onClick={handleTranscribeClick}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg w-full"
                >
                    Transcribe New Audio
                </button>
            </div>
            <div className="w-full mb-4">
                {currentFile && (
                    <div className="text-gray-700 mb-2">{currentFile}</div>
                )}
                <div className="relative w-full h-8 bg-gray-200 rounded-lg">
                    <div
                        className="absolute left-0 top-0 h-full bg-blue-500 text-white text-sm flex items-center justify-center"
                        style={{ width: `${progress}%`}}
                    >
                        {progress > 0 ? `${progress.toFixed(2)}% (${time})` : status}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Transcribe;