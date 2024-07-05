import React, { useState } from 'react';

import Audio from './Audio.tsx';
import Transcribe from './Transcribe.tsx';

function Tabs() {
    const [selectedTab, setSelectedTab] = useState('Audio');

    const renderContent = () => {
        switch (selectedTab) {
            case 'Audio':
                return <Audio />
            case 'Transcribe':
                return <Transcribe />
            case 'Summarize':
                return <></>
            default:
                return null;
        }
    };

    return (
        <div className="flex flex-col h-screen w-full">
          <div className="flex space-x-4 p-4 border-b bg-white w-full">
            <button
              className={`py-2 px-4 ${selectedTab === 'Audio' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-700'}`}
              onClick={() => setSelectedTab('Audio')}
            >
              Audio
            </button>
            <button
              className={`py-2 px-4 ${selectedTab === 'Transcribe' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-700'}`}
              onClick={() => setSelectedTab('Transcribe')}
            >
              Transcribe
            </button>
            <button
              className={`py-2 px-4 ${selectedTab === 'Summarize' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-700'}`}
              onClick={() => setSelectedTab('Summarize')}
            >
              Summarize
            </button>
          </div>
          <div className="flex-grow p-4 overflow-auto w-full">
            {renderContent()}
          </div>
        </div>
      );
}

export default Tabs;