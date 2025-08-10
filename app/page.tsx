"use client";

import React, { useState, useMemo } from 'react';

// ========= ICONS (SVG Components) - Corrected with Types =========
const ChevronDownIcon = ({ className }: { className: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
  </svg>
);

const MenuIcon = ({ className }: { className: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
);

const XIcon = ({ className }: { className: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);


// ========= SIDEBAR COMPONENT - Corrected with Types =========
const Sidebar = ({ isSidebarOpen, toggleSidebar }: { isSidebarOpen: boolean, toggleSidebar: () => void }) => {
  const [openSection, setOpenSection] = useState<string | null>(null);

  const cheatSheetData = useMemo(() => [
    {
      title: '🎬 Basic Elements',
      items: [
        { name: 'Scene Heading', example: 'INT. KITCHEN - NIGHT' },
        { name: 'Forced Scene Heading', example: '.INT. SPACESHIP - DAY' },
        { name: 'Action', example: 'Jane walks to the door.' },
        { name: 'Transition', example: 'CUT TO:' },
        { name: 'Forced Transition', example: '> FADE OUT.' },
      ],
    },
    {
      title: '👥 Characters & Dialogue',
      items: [
        { name: 'Character', example: 'JANE' },
        { name: 'Character (Extension)', example: 'JOHN (O.S.)' },
        { name: 'Dialogue', example: 'Hello there!' },
        { name: 'Parenthetical', example: '(whispering)' },
        { name: 'Dual Dialogue', example: 'JANE\nWhat are you doing?\n\nJOHN\n^I\'m not doing anything!' },
      ],
    },
    {
      title: '✨ Formatting',
      items: [
        { name: 'Italics', example: '*italicized text*' },
        { name: 'Bold', example: '**bold text**' },
        { name: 'Underline', example: '_underlined text_' },
        { name: 'Centered Text', example: '> THE END <' },
      ],
    },
    {
      title: '📋 Organization',
      items: [
        { name: 'Section', example: '# Act I' },
        { name: 'Synopsis', example: '= This scene introduces our hero.' },
        { name: 'Note', example: '[[This is a note to myself]]' },
        { name: 'Boneyard (Hidden)', example: '/* This text will be ignored */' },
      ],
    },
    {
      title: '⚙️ Special',
      items: [
        { name: 'Page Break', example: '===' },
        { name: 'Title Page', example: 'Title: BIG FISH\nAuthor: John August' },
        { name: 'Escaping', example: '\\*Not italic*' },
        { name: 'Forced Action', example: '!Jane yells.' },
      ],
    },
  ], []);

  const handleSectionToggle = (title: string) => {
    setOpenSection(openSection === title ? null : title);
  };
  
  const handleInsertExample = (example: string) => {
    console.log(`Pasting example:\n${example}`);
    alert(`Example copied to console!\n\n${example}`);
  };

  return (
    <aside className={`bg-white shadow-lg transition-all duration-300 ease-in-out h-screen overflow-y-auto ${isSidebarOpen ? 'w-80 p-4' : 'w-0 p-0'}`}>
      <div className={`transition-opacity duration-200 ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800">Fountain Syntax</h2>
          <button onClick={toggleSidebar} className="p-1 rounded-md hover:bg-gray-200">
            <XIcon className="w-6 h-6 text-gray-600" />
          </button>
        </div>
        <div className="space-y-2">
          {cheatSheetData.map((section, index) => (
            <div key={index} className="border-b border-gray-200 last:border-b-0">
              <button
                onClick={() => handleSectionToggle(section.title)}
                className="w-full flex justify-between items-center py-3 text-left font-semibold text-gray-700 hover:bg-gray-50 rounded-md px-2"
              >
                <span>{section.title}</span>
                <ChevronDownIcon className={`w-5 h-5 transition-transform ${openSection === section.title ? 'rotate-180' : ''}`} />
              </button>
              {openSection === section.title && (
                <div className="py-2 px-2 space-y-1 bg-gray-50">
                  {section.items.map((item, itemIndex) => (
                    <div
                      key={itemIndex}
                      onClick={() => handleInsertExample(item.example)}
                      className="p-2 rounded-md hover:bg-blue-100 cursor-pointer"
                    >
                      <p className="font-medium text-sm text-gray-600">{item.name}</p>
                      <pre className="text-xs text-blue-700 bg-blue-50 p-2 rounded mt-1 whitespace-pre-wrap font-mono">{item.example}</pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
};


// ========= UPLOAD FORM COMPONENT =========
const UploadForm = () => {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const allowedTypes = ['text/plain', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      
      if (allowedTypes.includes(selectedFile.type) || selectedFile.name.endsWith('.fountain')) {
          setFile(selectedFile);
          setErrorMessage('');
      } else {
          setFile(null);
          setErrorMessage('Unsupported file type. Please use .txt, .fountain, .docx, or .pdf');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) {
      setErrorMessage('Please select a file first.');
      return;
    }

    setStatus('uploading');
    setErrorMessage('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload-convert', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Conversion failed. Please check your file.');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${file.name.replace(/\.[^/.]+$/, "")}_converted.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setStatus('success');

    } catch (error: unknown) { // Corrected from 'any' to 'unknown'
      console.error(error);
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('An unknown error occurred.');
      }
      setStatus('error');
    } finally {
        setTimeout(() => {
            if (status !== 'error') {
                setStatus('idle');
                setFile(null);
            }
        }, 2000);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-2xl p-8 w-full border border-gray-200">
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-10 text-center transition-colors hover:border-blue-500 hover:bg-gray-50">
        <input
          type="file"
          id="file-upload"
          className="hidden"
          onChange={handleFileChange}
          accept=".txt,.fountain,.docx,.pdf"
        />
        <label
          htmlFor="file-upload"
          className="cursor-pointer font-semibold text-blue-600"
        >
          {file ? `Selected: ${file.name}` : 'Choose a file to upload'}
        </label>
        <p className="text-sm text-gray-500 mt-2">
          Supported formats: .txt, .fountain, .docx, .pdf
        </p>
      </div>

      {errorMessage && <p className="text-red-500 text-center mt-4">{errorMessage}</p>}

      <div className="mt-8">
        <button
          type="submit"
          disabled={!file || status === 'uploading'}
          className="w-full bg-blue-600 text-white font-bold text-lg py-3 px-4 rounded-lg hover:bg-blue-700 transition-all duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed transform hover:scale-105 disabled:transform-none"
        >
          {status === 'uploading' ? 'Converting...' : 'Convert to PDF'}
        </button>
      </div>
    </form>
  );
};


// ========= HOME PAGE COMPONENT =========
const HomePage = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    return (
        <div className="flex min-h-screen bg-gray-100 text-gray-800 font-sans">
            <Sidebar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

            <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 relative">
                {!isSidebarOpen && (
                    <button 
                        onClick={toggleSidebar}
                        className="absolute top-4 left-4 bg-white p-2 rounded-full shadow-lg hover:bg-gray-200 transition-all"
                        aria-label="Open sidebar"
                    >
                        <MenuIcon className="w-6 h-6 text-gray-700"/>
                    </button>
                )}
                <div className="w-full max-w-2xl text-center">
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">Fountain to Script</h1>
                    <p className="text-lg text-gray-600 mb-8">
                        Instantly convert your Fountain script into a professional, industry-standard PDF.
                    </p>
                    <UploadForm />
                </div>
            </div>
        </div>
    );
};


// ========= MAIN APP COMPONENT =========
export default function App() {
  return <HomePage />;
}
