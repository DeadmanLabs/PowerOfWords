import React, { useState, useRef, useEffect } from 'react';

function Audio() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recordingTimerRef = useRef<number | null>(null);

  const handleAudioUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setAudioFile(file);
  };

  const startRecording = () => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        const recorder = new MediaRecorder(stream);
        setMediaRecorder(recorder);
        recorder.start();

        recorder.ondataavailable = event => {
          setAudioChunks(prevChunks => [...prevChunks, event.data]);
        };

        recorder.onstop = () => {
          const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
          const audioFile = new File([audioBlob], 'recording.wav', { type: 'audio/wav' });
          setAudioFile(audioFile);
          setAudioChunks([]);
        };

        setIsRecording(true);
        recordingTimerRef.current = window.setInterval(() => {
          setRecordingTime(prevTime => prevTime + 1);
        }, 1000);
      });
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
    }
    setIsRecording(false);
    if (recordingTimerRef.current !== null) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  const handleUploadClick = async () => {
    if (audioFile) {
      const formData = new FormData();
      formData.append('file', audioFile);

      const metadata = {
        filename: audioFile.name,
        type: audioFile.type,
        lastModified: audioFile.lastModified
      };
      formData.append('metadata', JSON.stringify(metadata));
      try {
        const response = await fetch('https://localhost/audio', {
            method: 'POST',
            body: formData
        });
        if (response.ok) {
            console.log('File uploaded successfully');
        } else {
            console.error('File upload failed');
        }
      } catch (error) {
        console.error('Error uploading file:', error);
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="mb-4 w-full">
        <label
          htmlFor="audio-upload"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Upload an audio file:
        </label>
        <input
          type="file"
          id="audio-upload"
          accept="audio/*"
          ref={fileInputRef}
          className="hidden"
          onChange={handleAudioUpload}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg w-full"
        >
          Select Audio File
        </button>
      </div>
      <div className="mb-4 w-full">
        <button
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          className={`relative px-6 py-3 text-white rounded-lg w-full focus:outline-none ${isRecording ? 'bg-red-500' : 'bg-green-500'}`}
        >
          {isRecording ? `Recording... (${recordingTime}s)` : 'Hold to Record'}
        </button>
      </div>
      <div className="w-full">
        <button
          onClick={handleUploadClick}
          className="px-4 py-2 bg-green-500 text-white rounded-lg w-full"
        >
          Upload Audio
        </button>
      </div>
      {audioFile && (
        <div className="mt-4 text-sm text-gray-700 w-full">
          <p>Audio file: {audioFile.name}</p>
          <p>Audio duration: {Math.floor(recordingTime / 60)}m {recordingTime % 60}s</p>
        </div>
      )}
    </div>
  );
}

export default Audio;
