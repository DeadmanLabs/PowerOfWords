import os
import sys
import subprocess
import websocket
import json
from tqdm import tqdm

def transcribe_audio(file_path, ws_url, client_id):
    try:
        # Build the command to run whisper.cpp
        command = [
            "./whisper.cpp/main.exe",  # Path to the compiled whisper.cpp executable
            "-m", "models/ggml-medium.en.bin",  # Path to the Whisper model
            "-f", file_path,  # Path to the audio file
            "-otxt"  # Output the transcription as text
        ]

        # Connect to the WebSocket server
        ws = websocket.create_connection(ws_url)

        # Run the whisper.cpp subprocess
        process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

        # Use tqdm to create a progress bar
        with tqdm(total=100, desc="Transcribing", bar_format="{l_bar}{bar}| {n:.1f}%") as pbar:
            while process.poll() is None:
                output = process.stdout.readline()
                if output:
                    print(output.strip())  # Print the transcription in real-time
                    pbar.update(1)  # Update the progress bar by 1 unit (or adjust based on your needs)
                    ws.send(json.dumps({"type": "progress", "client_id": client_id, "data": output.strip()}))

        # Get any remaining output after the process finishes
        remaining_output = process.stdout.read()
        if remaining_output:
            print(remaining_output.strip())
            ws.send(json.dumps({"type": "result", "client_id": client_id, "data": remaining_output.strip()}))

        # Close the WebSocket connection
        ws.close()

    except Exception as e:
        print(f"Error during transcription: {e}")
        ws.send(json.dumps({"type": "error", "client_id": client_id, "data": str(e)}))
        ws.close()
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Usage: python transcribe.py path/to/audioFile ws://localhost:5000 client_id")
        sys.exit(1)

    file_path = sys.argv[1]
    ws_url = sys.argv[2]
    client_id = sys.argv[3]
    
    if not os.path.exists(file_path):
        print(f"Error: File '{file_path}' not found.")
        sys.exit(1)

    print(f"Starting transcription for file: {file_path}")
    print(f"WebSocket URL: {ws_url}")
    print(f"Client ID: {client_id}")

    # Run the transcription
    transcribe_audio(file_path, ws_url, client_id)
