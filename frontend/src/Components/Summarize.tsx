import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

interface TranscriptionFile {
    file: string;
    hasTranscription: boolean;
}

function Summarize() {
    const [transcriptionFiles, setTranscriptionFiles] = useState<TranscriptionFile[]>([]);
    const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
    const [summary, setSummary] = useState<string>('');
    const socketRef = useRef<any>(null);

    const fetchTranscriptionFiles = async () => {
        try {
            const response = await fetch('http://localhost:5000/files');
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            setTranscriptionFiles(data);
        } catch (error) {
            console.error('Error fetching transcription files:', error);
        }
    };

    useEffect(() => {
        fetchTranscriptionFiles();
        socketRef.current = io('http://localhost:5000');
        socketRef.current.on('summary_text', (data: { text: string }) => {
            setSummary(prevSummary => prevSummary + data.text);
        });

        return () => {
            socketRef.current.disconnect();
        };
    }, []);

    const handleCheckboxChange = (file: string) => {
        setSelectedFiles(prevSelectedFiles =>
            prevSelectedFiles.includes(file)
                ? prevSelectedFiles.filter(f => f !== file)
                : [...prevSelectedFiles, file]
        );
    };

    const handleSummarizeClick = async () => {
        setSummary('');
        try {
            const response = await fetch('http://localhost:5000/summarize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ files: selectedFiles })
            });
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let done = false;

            while (!done) {
                const { value, done: doneReading } = await reader?.read()!;
                done = doneReading;
                const chunk = decoder.decode(value, { stream: true });
                setSummary(prevSummary => prevSummary + chunk);
            }
        } catch (error) {
            console.error('Error summarizing texts:', error);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center w-full p-4">
            <div className="w-full mb-4">
                <h2 className="text-lg font-bold mb-2">Transcription Files</h2>
                <ul className="list-disc list-inside bg-white p-4 rounded-lg shadow-md">
                    {transcriptionFiles.map((file, index) => (
                        <li key={index} className="text-gray-700 flex justify-between items-center">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={selectedFiles.includes(file.file)}
                                    onChange={() => handleCheckboxChange(file.file)}
                                />
                                {file.file}
                            </label>
                        </li>
                    ))}
                </ul>
            </div>
            <div className="w-full mb-4">
                <button
                    onClick={handleSummarizeClick}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg w-full"
                >
                    Summarize Texts
                </button>
            </div>
            <div className="w-full mb-4">
                <textarea
                    value={summary}
                    readOnly
                    className="w-full h-64 p-4 border border-gray-300 rounded-lg"
                />
            </div>
        </div>
    );
}

export default Summarize;