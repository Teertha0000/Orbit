import { useState, useRef, useCallback, useEffect } from 'react';
import { geminiLiveService, SessionState, TranscriptionUpdate, ToolCallUpdate } from '../services/geminiLiveService';

export { SessionState }; // Re-export for the UI component

export interface Transcript {
    id: string;
    speaker: 'user' | 'ai';
    text: string;
}

export const useVoiceAssistant = () => {
    const [sessionState, setSessionState] = useState<SessionState>(SessionState.IDLE);
    const [transcripts, setTranscripts] = useState<Transcript[]>([]);
    const [inProgressTranscript, setInProgressTranscript] = useState<{ user: string; ai: string } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [toolResults, setToolResults] = useState<ToolCallUpdate[]>([]);

    const userTranscriptRef = useRef('');
    const aiTranscriptRef = useRef('');
    const messageCounterRef = useRef(0);
    const lastSpeakerRef = useRef<'user' | 'ai' | null>(null);
    
    const handleStateChange = useCallback((state: SessionState) => {
        if (state === SessionState.IDLE || state === SessionState.ERROR) {
            const pendingTranscripts: Transcript[] = [];
            
            if (userTranscriptRef.current.trim()) {
                pendingTranscripts.push({
                    id: `${Date.now()}-${messageCounterRef.current++}-user`,
                    speaker: 'user',
                    text: userTranscriptRef.current.trim()
                });
            }
            if (aiTranscriptRef.current.trim()) {
                pendingTranscripts.push({
                    id: `${Date.now()}-${messageCounterRef.current++}-ai`,
                    speaker: 'ai',
                    text: aiTranscriptRef.current.trim()
                });
            }
            
            if (pendingTranscripts.length > 0) {
                setTranscripts(prev => [...prev, ...pendingTranscripts]);
            }
            
            userTranscriptRef.current = '';
            aiTranscriptRef.current = '';
            lastSpeakerRef.current = null;
            setInProgressTranscript(null);
        }
        setSessionState(state);
    }, []);

    const handleError = useCallback((errorMessage: string) => {
        setError(errorMessage);
        setSessionState(SessionState.ERROR);
    }, []);
    
    const handleToolCall = useCallback((toolUpdate: ToolCallUpdate) => {
        setToolResults(prev => [...prev, toolUpdate]);
    }, []);

    const handleTranscriptionUpdate = useCallback((update: TranscriptionUpdate) => {
        const { text, isFinal, speaker } = update;
        
        if (lastSpeakerRef.current && lastSpeakerRef.current !== speaker) {
            const prevSpeaker = lastSpeakerRef.current;
            const prevText = prevSpeaker === 'user' ? userTranscriptRef.current : aiTranscriptRef.current;
            
            if (prevText.trim()) {
                setTranscripts(prev => [
                    ...prev, 
                    { id: `${Date.now()}-${messageCounterRef.current++}-${prevSpeaker}`, speaker: prevSpeaker, text: prevText.trim() }
                ]);
                
                if (prevSpeaker === 'user') userTranscriptRef.current = '';
                else aiTranscriptRef.current = '';
            }
        }
        
        lastSpeakerRef.current = speaker;
        
        if (isFinal) {
            const finalText = text.trim();
            if (finalText) {
                setTranscripts(prev => [
                    ...prev, 
                    { id: `${Date.now()}-${messageCounterRef.current++}-${speaker}`, speaker, text: finalText }
                ]);
            }
            
            if (speaker === 'user') userTranscriptRef.current = '';
            else if (speaker === 'ai') aiTranscriptRef.current = '';
            
            setInProgressTranscript({ user: userTranscriptRef.current, ai: aiTranscriptRef.current });

        } else {
            if (speaker === 'user') userTranscriptRef.current += text;
            else aiTranscriptRef.current += text;
            
            setInProgressTranscript({ user: userTranscriptRef.current, ai: aiTranscriptRef.current });
        }
    }, []);

    const startSession = useCallback(async () => {
        setError(null);
        // Clear previous session data for a clean start
        setToolResults([]); 
        geminiLiveService.startSession({
            onStateChange: handleStateChange,
            onTranscriptionUpdate: handleTranscriptionUpdate,
            onError: handleError,
            onToolCall: handleToolCall,
        });
    }, [handleStateChange, handleTranscriptionUpdate, handleError, handleToolCall]);

    const stopSession = useCallback(() => {
        geminiLiveService.stopSession();
    }, []);
    
    useEffect(() => {
        return () => geminiLiveService.stopSession();
    }, []);

    return {
        sessionState,
        transcripts,
        inProgressTranscript,
        error,
        startSession,
        stopSession,
        toolResults,
    };
};