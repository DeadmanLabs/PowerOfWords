import React, { useState, useRef, useEffect } from 'react';

function Audio() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recordingTimerRef = useRef<number | null>(null);

  const handleAudioUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    // Stop any ongoing recording
    if (isRecording) {
      stopRecording();
    }

    const file = event.target.files?.[0] || null;
    if (file) {
      console.log('Selected file:', file);
      const audio = new window.Audio(URL.createObjectURL(file)); // Use window.Audio
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
    setAudioFile(file);
    setRecordingTime(0); // Reset recording time when a new file is selected
  };

  const startRecording = () => {
    // Reset audio file, duration, recording time, and audio chunks when starting a new recording
    setAudioFile(null);
    setAudioDuration(null);
    setRecordingTime(0);
    setAudioChunks([]);

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
          setAudioDuration(recordingTime); // Directly set the duration from recordingTime
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
        const response = await fetch('http://localhost:5000/audio', {
            method: 'POST',
            body: formData
        });
        if (response.ok) {
            const data = await response.json();
            console.log('File uploaded successfully', data);
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
          <p>Audio duration: {audioDuration !== null ? `${Math.floor(audioDuration / 60)}m ${Math.floor(audioDuration % 60)}s` : 'Loading...'}</p>
        </div>
      )}
    </div>
  );
}

export default Audio;
