// FIX: Re-added the triple-slash directive. While global type augmentation in a
// module *should* be picked up automatically by TypeScript, it seems the project
// configuration is not set up for it. This explicit reference ensures the types
// from `env.d.ts` are correctly loaded.
/// <reference path="env.d.ts" />

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useVoiceAssistant, SessionState, Transcript } from './hooks/useVoiceAssistant';
import { Settings } from './components/Settings';

// --- UI COMPONENTS (Defined outside App to prevent re-creation on re-renders) ---

const SplineScene: React.FC = () => (
  <div className="absolute top-0 left-0 w-full h-full z-0">
    <spline-viewer
      url="https://prod.spline.design/v0mxU-lNuk3mfSZe/scene.splinecode"
      loading-anim-type="spinner-big-white"
    />
  </div>
);

// New Component for Displaying Search Results
const SearchResultsDisplay: React.FC<{ data: any }> = ({ data }) => {
  // Initial empty state
  if (!data) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2h1a2 2 0 002-2v-1a2 2 0 012-2h1.945M7.75 16.5v-4.25a.75.75 0 01.75-.75h2.5a.75.75 0 01.75.75v4.25m-4 0h4" />
            </svg>
            <h3 className="text-lg font-semibold text-white">Web Search</h3>
            <p className="text-gray-400 mt-2 text-sm max-w-xs">When Orbit searches the web for real-time information, the results will appear here.</p>
        </div>
    );
  }

  // Case 1: Intermediate search status (Loading state)
  if (data.inProgress) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in">
        <svg className="w-8 h-8 text-blue-400 animate-spin mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <h3 className="text-lg font-semibold text-white">Searching the web...</h3>
      </div>
    );
  }

  // Case 2: Final grounding metadata
  const { aiResponse, webSearchQueries, groundingChunks, searchEntryPoint } = data;
  const primaryQuery = webSearchQueries?.[0];
  const otherQueries = webSearchQueries?.slice(1);
  const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex flex-col items-center animate-fade-in text-center">
        {/* Centered Header */}
        <h2 className="text-lg font-bold text-white tracking-tight">Web Search Results</h2>
        <p className="text-xs text-gray-500 mb-6">{timestamp}</p>

        <div className="w-full text-left space-y-8">
            {/* 1. Primary Query - BIG FONT */}
            {primaryQuery && (
                <h2 className="text-3xl font-bold text-white tracking-tight query-title text-center pb-2">
                {primaryQuery}
                </h2>
            )}

            {/* Render the searchEntryPoint widget */}
            {searchEntryPoint?.renderedContent && (
                <div 
                    className="search-widget-container"
                    dangerouslySetInnerHTML={{ __html: searchEntryPoint.renderedContent }} 
                />
            )}

            {/* 2. Sources */}
            {groundingChunks && groundingChunks.length > 0 && (
                <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    Sources
                </h3>
                <div className="space-y-3">
                    {groundingChunks.map((chunk: any, index: number) => {
                    if (!chunk.web || !chunk.web.uri) return null;
                    const domain = new URL(chunk.web.uri).hostname.replace('www.', '');
                    return (
                        <a 
                        key={index} 
                        href={chunk.web.uri} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="block p-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors group"
                        >
                        <p className="text-sm font-semibold text-white truncate group-hover:text-blue-300 transition-colors">{chunk.web.title || 'Web Source'}</p>
                        {chunk.web.snippet && (
                            <p className="text-xs text-gray-400 mt-2 font-normal line-clamp-2">{chunk.web.snippet}</p>
                        )}
                        <p className="text-xs text-green-400 mt-2 flex items-center gap-1.5">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                            </svg>
                            {domain}
                        </p>
                        </a>
                    );
                    })}
                </div>
                </div>
            )}
            
            {/* 3. Related Queries */}
            {otherQueries && otherQueries.length > 0 && (
                <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Related Queries
                </h3>
                <div className="flex flex-wrap gap-2">
                    {otherQueries.map((query: string, index: number) => (
                    <span key={index} className="px-3 py-1 bg-blue-500/10 text-blue-300 text-xs font-medium rounded-full">
                        {query}
                    </span>
                    ))}
                </div>
                </div>
            )}

            {/* 4. AI's Answer - AT THE BOTTOM */}
            {aiResponse && (
                <div className="pt-6 border-t border-white/10">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                    </svg>
                    Orbit's Answer
                </h3>
                <blockquote className="border-l-4 border-blue-400/50 pl-4 text-gray-300 italic">
                    {aiResponse.trim()}
                </blockquote>
                </div>
            )}
        </div>
    </div>
  );
};

// New Component for Code Execution Results
const CodeExecutionDisplay: React.FC<{ data: any | null }> = ({ data }) => {
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
        <h3 className="text-lg font-semibold text-white">Code Execution</h3>
        <p className="text-gray-400 mt-2 text-sm max-w-xs">When Orbit runs code to solve problems, the details will appear here.</p>
      </div>
    );
  }

  const { command, output, image, outcome } = data;
  const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const derivedOutcome = outcome || (image ? 'OUTCOME_OK' : undefined);
  const isOk = derivedOutcome === 'OUTCOME_OK';

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4 animate-fade-in code-card space-y-4 w-full">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-white">Execution Result</h3>
        <p className="text-xs text-gray-500">{timestamp}</p>
      </div>

      {/* Execution Output (Text or Image) */}
      <div className="output-block">
        <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-semibold text-gray-400">Execution Output</h4>
            {derivedOutcome && (
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${isOk ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                {derivedOutcome.replace('OUTCOME_', '')}
                </span>
            )}
        </div>
        
        {(command || output) && (
            <pre className="block bg-black/30 p-3 rounded font-mono text-xs text-gray-300 overflow-x-auto scrollbar-hide whitespace-pre-wrap break-words">
                <code>
                    {command && <span className="text-gray-500">{`> ${command}\n\n`}</span>}
                    {output}
                </code>
            </pre>
        )}

        {image && (
            <div className="mt-2 p-3 bg-black/30 rounded flex justify-center image-container">
                <img src={`data:image/png;base64,${image}`} alt="Generated graph or image" className="max-w-full h-auto rounded" />
            </div>
        )}

        {!command && !output && !image && (
             <p className="text-xs text-gray-500 italic">No output was generated.</p>
        )}
      </div>
    </div>
  );
};


// Collapsible Chat Panel Component
interface CollapsibleChatPanelProps {
  transcripts: Transcript[];
  inProgress: { user: string; ai: string } | null;
  isCollapsed: boolean;
  onToggle: () => void;
  panelWidth: number;
  onWidthChange: (width: number) => void;
}

// Collapsible Tools Panel Component
interface CollapsibleToolsPanelProps {
  isCollapsed: boolean;
  onToggle: () => void;
  panelWidth: number;
  onWidthChange: (width: number) => void;
  searchResultData: any | null;
  codeResultData: any | null;
  activeTab: 'search' | 'code';
  onTabChange: (tab: 'search' | 'code') => void;
}
const CollapsibleChatPanel: React.FC<CollapsibleChatPanelProps> = ({ 
    transcripts, 
    inProgress, 
    isCollapsed, 
    onToggle,
    panelWidth,
    onWidthChange 
}) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [isResizing, setIsResizing] = useState(false);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [transcripts, inProgress]);
    
    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;
            const cursorX = e.clientX;
            const newWidth = Math.max(280, Math.min(600, cursorX));
            if (cursorX <= 200) {
                onToggle();
                setIsResizing(false);
            } else {
                onWidthChange(newWidth);
            }
        };
        const handleMouseUp = () => setIsResizing(false);

        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'ew-resize';
            document.body.style.userSelect = 'none';
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
    }, [isResizing, onWidthChange, onToggle]);
    
    return (
        <>
            <div 
                className={`absolute top-6 bottom-6 left-0 z-20 ${
                    isCollapsed ? '-translate-x-full' : 'translate-x-0'
                }`}
                style={{ 
                    width: `${panelWidth}px`,
                    transition: isResizing ? 'none' : 'all 0.5s ease-in-out'
                }}
            >
                <div className="h-full bg-white/5 backdrop-blur-xl rounded-r-3xl rounded-l-none border border-white/20 flex flex-col relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)' }}>
                    <div
                        onMouseDown={handleMouseDown}
                        className="absolute top-0 right-0 bottom-0 w-1 cursor-ew-resize hover:bg-white/30 transition-colors group"
                        style={{ zIndex: 100 }}
                    >
                        <div className="absolute inset-y-0 -right-1 w-3" />
                    </div>
                    <div className="p-4 pb-3 border-b border-white/10">
                        <h2 className="text-white font-semibold text-lg">Conversation</h2>
                    </div>
                    
                    <div 
                        ref={scrollRef}
                        className="flex-1 overflow-y-auto px-5 py-4 space-y-3 flex flex-col scrollbar-hide"
                        style={{ scrollbarWidth: 'none',  msOverflowStyle: 'none' }}
                    >
                        {transcripts.length === 0 && !inProgress && (
                            <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 animate-fade-in">
                                <svg className="w-16 h-16 text-gray-600 mb-4" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="2"/>
                                    <circle cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4"/>
                                    <circle cx="25" cy="35" r="4" fill="currentColor"/>
                                </svg>
                                <h3 className="text-lg font-semibold text-white">Orbit is Ready</h3>
                                <p className="mt-2 text-sm max-w-xs text-gray-400">Click the microphone button below to start a conversation.</p>
                            </div>
                        )}
                        {transcripts.map((t) => (
                            <div key={t.id} className={`flex w-full ${t.speaker === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div
                                    className={`max-w-[85%] px-4 py-2.5 rounded-2xl ${
                                        t.speaker === 'user' 
                                            ? 'bg-white/80 text-black rounded-br-sm' 
                                            : 'bg-gray-800/90 text-white rounded-bl-sm'
                                    }`}
                                style={{ 
                                    wordWrap: 'break-word',
                                    overflowWrap: 'break-word',
                                    wordBreak: 'break-word',
                                    whiteSpace: 'pre-wrap'
                                }}>
                                    <p className={`text-sm leading-relaxed ${t.speaker === 'user' ? 'text-black' : 'text-white'}`}>
                                        {t.text}
                                    </p>
                                </div>
                            </div>
                        ))}
                        {inProgress && (
                            <>
                                {inProgress.user && (
                                    <div className="flex justify-end w-full">
                                        <div className="max-w-[85%] px-4 py-2.5 rounded-2xl bg-white/70 text-black rounded-br-sm"
                                             style={{ wordWrap: 'break-word', overflowWrap: 'break-word', whiteSpace: 'pre-wrap' }}>
                                            <p className="text-black text-sm italic">{inProgress.user}</p>
                                        </div>
                                    </div>
                                )}
                                {inProgress.ai && (
                                    <div className="flex justify-start w-full">
                                        <div className="max-w-[85%] px-4 py-2.5 rounded-2xl bg-gray-800/90 text-white rounded-bl-sm"
                                             style={{ wordWrap: 'break-word', overflowWrap: 'break-word', whiteSpace: 'pre-wrap' }}>
                                            <p className="text-gray-300 text-sm italic">{inProgress.ai}</p>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
            
            <button
                onClick={onToggle}
                className="fixed top-1/2 -translate-y-1/2 z-30 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white hover:bg-white/10 pointer-events-auto rounded-r-xl rounded-l-none"
                style={{
                    width: '32px',
                    height: '64px',
                    left: isCollapsed ? 0 : `${panelWidth}px`,
                    transition: isResizing ? 'none' : 'left 0.5s ease-in-out',
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)'
                }}
            >
                <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className={`h-5 w-5 transition-transform duration-300 ${isCollapsed ? 'rotate-0' : 'rotate-180'}`}
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
            </button>
        </>
    );
};

const StatusIndicator: React.FC<{ state: SessionState; error: string | null }> = ({ state, error }) => {
  let statusText = error ? `Error: ${error}` : '';
  if (!error) {
    switch (state) {
      case SessionState.CONNECTING: statusText = 'Connecting...'; break;
      case SessionState.ACTIVE: statusText = 'Listening...'; break;
      case SessionState.IDLE: statusText = 'Click to start'; break;
    }
  }
  return (
    <p className="h-6 text-center text-gray-400 mb-4 transition-opacity duration-300 pointer-events-none">
      {statusText}
    </p>
  );
};

const ControlButton: React.FC<{ state: SessionState; onStart: () => void; onStop: () => void }> = ({ state, onStart, onStop }) => {
    const isIdle = state === SessionState.IDLE || state === SessionState.ERROR;
    const isConnecting = state === SessionState.CONNECTING;
    const isActive = state === SessionState.ACTIVE;
    const glassStyle: React.CSSProperties = {
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.06) 100%)',
        boxShadow: isActive ? '0 0 25px rgba(230, 230, 231, 0.45)' : '0 0 20px rgba(15, 23, 42, 0.4)',
    };
    return (
        <button
            onClick={isIdle ? onStart : onStop}
            disabled={isConnecting}
            className="w-20 h-20 rounded-full backdrop-blur-xl flex items-center justify-center text-white transition-all duration-300 ease-in-out transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed pointer-events-auto border border-white/20"
            style={glassStyle}
        >
            {isConnecting && <div className="w-8 h-8 border-4 border-t-transparent border-white rounded-full animate-spin"></div>}
            {isIdle && <MicrophoneIcon />}
            {isActive && <StopIcon />}
        </button>
    );
};

const MicrophoneIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
);
const StopIcon = () => <div className="w-6 h-6 bg-red-500 rounded-md"></div>;

const CollapsibleToolsPanel: React.FC<CollapsibleToolsPanelProps> = ({ 
    isCollapsed, onToggle, panelWidth, onWidthChange, searchResultData, codeResultData, activeTab, onTabChange
}) => {
    const [isResizing, setIsResizing] = useState(false);
    
    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;
            const cursorX = window.innerWidth - e.clientX;
            const newWidth = Math.max(280, Math.min(600, cursorX));
            if (cursorX <= 200) {
                onToggle();
                setIsResizing(false);
            } else {
                onWidthChange(newWidth);
            }
        };
        const handleMouseUp = () => setIsResizing(false);

        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'ew-resize';
            document.body.style.userSelect = 'none';
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
    }, [isResizing, onWidthChange, onToggle]);
    
    return (
        <>
            <div 
                className={`absolute right-0 z-20 ${isCollapsed ? 'translate-x-full' : 'translate-x-0'}`}
                style={{ 
                    top: '90px', bottom: '24px', width: `${panelWidth}px`,
                    transition: isResizing ? 'none' : 'all 0.5s ease-in-out'
                }}
            >
                <div className="h-full bg-white/5 backdrop-blur-xl rounded-l-3xl rounded-r-none border border-white/20 flex flex-col relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)' }}>
                    <div onMouseDown={handleMouseDown} className="absolute top-0 left-0 bottom-0 w-1 cursor-ew-resize hover:bg-white/30 transition-colors group" style={{ zIndex: 100 }}>
                        <div className="absolute inset-y-0 -left-1 w-3" />
                    </div>
                    <div className="px-2 pt-2 border-b border-white/10">
                        <div className="flex items-center">
                            <button onClick={() => onTabChange('search')} className={`flex-1 px-3 py-2 text-sm font-semibold transition-all rounded-t-md border-b-2 flex items-center justify-center gap-2 ${activeTab === 'search' ? 'text-white border-blue-400 bg-white/5' : 'text-gray-400 hover:text-white border-transparent hover:bg-white/5'}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                Search
                            </button>
                            <button onClick={() => onTabChange('code')} className={`flex-1 px-3 py-2 text-sm font-semibold transition-all rounded-t-md border-b-2 flex items-center justify-center gap-2 ${activeTab === 'code' ? 'text-white border-blue-400 bg-white/5' : 'text-gray-400 hover:text-white border-transparent hover:bg-white/5'}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                                Code
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto px-5 py-4 scrollbar-hide flex flex-col">
                        {activeTab === 'search' && <SearchResultsDisplay data={searchResultData} />}
                        {activeTab === 'code' && (
                            <div className="my-auto">
                                <CodeExecutionDisplay data={codeResultData} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            <button
                onClick={onToggle}
                className="fixed top-1/2 -translate-y-1/2 z-30 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white hover:bg-white/10 pointer-events-auto rounded-l-xl rounded-r-none"
                style={{
                    width: '32px', height: '64px',
                    right: isCollapsed ? 0 : `${panelWidth}px`,
                    transition: isResizing ? 'none' : 'right 0.5s ease-in-out',
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)'
                }}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : 'rotate-0'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
            </button>
        </>
    );
};

// --- MAIN APP COMPONENT ---

export default function App() {
  const { 
    sessionState, transcripts, inProgressTranscript, error, startSession, stopSession, toolResults 
  } = useVoiceAssistant();

  // Panel states
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [panelWidth, setPanelWidth] = useState(360);
  const [isToolsPanelCollapsed, setIsToolsPanelCollapsed] = useState(true);
  const [toolsPanelWidth, setToolsPanelWidth] = useState(420);
  const [searchResultData, setSearchResultData] = useState<any | null>(null);
  const [codeResultData, setCodeResultData] = useState<any | null>(null);
  const [activeToolTab, setActiveToolTab] = useState<'search' | 'code'>('search');
  
  // This effect handles updates from the voice assistant hook.
  useEffect(() => {
    if (toolResults.length === 0) return;
    
    const latestTool = toolResults[toolResults.length - 1];
  
    switch (latestTool.toolName) {
      case 'google_search':
        setSearchResultData(latestTool.result);
        setCodeResultData(null); 
        setActiveToolTab('search');
        if (isToolsPanelCollapsed) setIsToolsPanelCollapsed(false);
        break;
  
      case 'code_execution':
        setCodeResultData(latestTool.result);
        setSearchResultData(null); 
        setActiveToolTab('code');
        if (isToolsPanelCollapsed) setIsToolsPanelCollapsed(false);
        break;
    }
  }, [toolResults]); // FIX: Removed isToolsPanelCollapsed from dependency array

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-black font-sans text-white flex flex-col items-center justify-center">
      <SplineScene />
      <CollapsibleChatPanel 
        transcripts={transcripts} inProgress={inProgressTranscript} isCollapsed={isPanelCollapsed}
        onToggle={() => setIsPanelCollapsed(!isPanelCollapsed)} panelWidth={panelWidth} onWidthChange={setPanelWidth}
      />
      
      <CollapsibleToolsPanel 
        isCollapsed={isToolsPanelCollapsed} onToggle={() => setIsToolsPanelCollapsed(!isToolsPanelCollapsed)}
        panelWidth={toolsPanelWidth} onWidthChange={setToolsPanelWidth}
        searchResultData={searchResultData} codeResultData={codeResultData}
        activeTab={activeToolTab} onTabChange={setActiveToolTab}
      />
      
      <button
        onClick={() => setIsSettingsOpen(true)}
        className="fixed top-6 right-6 z-30 w-12 h-12 rounded-full backdrop-blur-xl border border-white/20 flex items-center justify-center text-white hover:bg-white/10 transition-all duration-300 pointer-events-auto"
        style={{ background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)' }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center justify-center p-6 md:p-8 z-10 pointer-events-none">
        <StatusIndicator state={sessionState} error={error} />
        <ControlButton state={sessionState} onStart={startSession} onStop={stopSession} />
      </div>
      
      <Settings isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </main>
  );
}