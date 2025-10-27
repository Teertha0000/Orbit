import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { createBlob, decode, decodeAudioData } from '../utils/audio';

export enum SessionState {
  IDLE,
  CONNECTING,
  ACTIVE,
  ERROR,
}

export type TranscriptionUpdate = {
  text: string;
  isFinal: boolean;
  speaker: 'user' | 'ai';
};

export type ToolCallUpdate = {
  toolName: string;
  result: any;
};

interface ServiceCallbacks {
  onStateChange: (state: SessionState) => void;
  onTranscriptionUpdate: (update: TranscriptionUpdate) => void;
  onError: (error: string) => void;
  onToolCall?: (update: ToolCallUpdate) => void;
}

class GeminiLiveService {
  private ai?: GoogleGenAI;
  private sessionPromise: Promise<any> | null = null;
  
  private stream: MediaStream | null = null;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private inputNode: MediaStreamAudioSourceNode | null = null;
  
  private outputGainNode: GainNode | null = null;
  private playingSources = new Set<AudioBufferSourceNode>();
  private nextStartTime = 0;

  private callbacks: ServiceCallbacks | null = null;
  
  // State for tracking tool calls within a single turn
  private isSearchActiveInTurn: boolean = false;
  private currentAiResponseForTurn: string = '';
  private currentCodeExecutionResult: any = null;


  public async startSession(callbacks: ServiceCallbacks): Promise<void> {
    if (this.sessionPromise) {
      console.warn("Session is already starting or active.");
      return;
    }
    this.callbacks = callbacks;
    this.callbacks.onStateChange(SessionState.CONNECTING);

    try {
      let settings: any = {};
      const savedSettings = localStorage.getItem('orbitalVoiceSettings');
      if (savedSettings) {
        try {
          settings = JSON.parse(savedSettings);
        } catch (e) {
          console.error('Failed to parse settings:', e);
        }
      }
      
      // CRITICAL: Get API key with proper priority
      // Priority: 1) Electron storage, 2) Environment variable
      let apiKey = process.env.API_KEY;
      
      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        // Running in Electron - get API key from main process (secure storage)
        try {
          const electronApiKey = await (window as any).electronAPI.getApiKey();
          if (electronApiKey) {
            apiKey = electronApiKey;
            console.log('✅ Using API key from Electron secure storage');
          } else {
            console.warn('⚠️ No API key found in Electron storage, falling back to environment');
          }
        } catch (e) {
          console.error('❌ Failed to get API key from Electron:', e);
        }
      }
      
      if (!apiKey) {
        throw new Error('API key is required. Please add your API key in Settings.');
      }
      
      const modelName = settings.modelName || 'gemini-2.5-flash-native-audio-preview-09-2025';
      const systemInstruction = settings.systemInstruction || 'You are Orbit, a friendly and helpful voice assistant. You can run Python code to solve problems. When asked to create a plot or graph, you must use the Matplotlib library to generate and display it.';
      const voiceName = settings.voiceName || 'Puck';
      const enableGoogleSearch = settings.enableGoogleSearch !== false;
      
      console.log('🤖 Initializing Gemini with model:', modelName);
      this.ai = new GoogleGenAI({ apiKey });
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      this.outputGainNode = this.outputAudioContext.createGain();
      this.outputGainNode.connect(this.outputAudioContext.destination);
      
      const config: any = {
        responseModalities: [Modality.AUDIO],
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        systemInstruction: systemInstruction,
      };
      
      if (voiceName) {
        config.speechConfig = { voiceConfig: { prebuiltVoiceConfig: { voiceName }}};
      }
      
      const tools: any[] = [];
      tools.push({ codeExecution: {} });
      if (enableGoogleSearch) {
        tools.push({ googleSearch: {} });
      }
      
      if (tools.length > 0) {
        config.tools = tools;
      }
      
      this.sessionPromise = this.ai.live.connect({
        model: modelName,
        config: config,
        callbacks: {
          onopen: () => {
            this.callbacks?.onStateChange(SessionState.ACTIVE);
            this.streamAudio();
          },
          onmessage: (message: LiveServerMessage) => this.handleServerMessage(message),
          onerror: (e: ErrorEvent) => this.handleError(e),
          onclose: () => this.stopSession(),
        },
      });
      await this.sessionPromise;
    } catch (error: any) {
      this.callbacks?.onError(error.message || "Failed to initialize the voice session.");
      this.stopSession();
    }
  }

  public stopSession(): void {
    if (!this.sessionPromise && !this.callbacks) return;

    this.scriptProcessor?.disconnect();
    this.inputNode?.disconnect();
    this.stream?.getTracks().forEach(track => track.stop());
    
    if (this.inputAudioContext?.state === 'running') this.inputAudioContext?.close();
    if (this.outputAudioContext?.state === 'running') this.outputAudioContext?.close();

    this.playingSources.forEach(source => source.stop());
    this.playingSources.clear();

    this.sessionPromise?.then(session => session.close()).catch(console.error);
    
    this.sessionPromise = null;
    this.stream = null;
    this.inputAudioContext = null;
    this.outputAudioContext = null;
    this.scriptProcessor = null;
    this.inputNode = null;
    this.nextStartTime = 0;
    
    this.resetTurnState();
    
    this.callbacks?.onStateChange(SessionState.IDLE);
    this.callbacks = null;
  }
  
  private resetTurnState() {
    this.isSearchActiveInTurn = false;
    this.currentAiResponseForTurn = '';
    this.currentCodeExecutionResult = null;
  }

  private handleError(e: ErrorEvent) {
    if (e.message?.includes('CLOSING or CLOSED')) return;
    this.callbacks?.onError(e.message || "An unknown session error occurred.");
    this.stopSession();
  }

  private streamAudio(): void {
    if (!this.inputAudioContext || !this.stream || !this.sessionPromise) return;

    const source = this.inputAudioContext.createMediaStreamSource(this.stream);
    this.inputNode = source;
    this.scriptProcessor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);
    
    this.scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
      const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
      const pcmBlob = createBlob(inputData);
      this.sessionPromise?.then((session) => session?.sendRealtimeInput({ media: pcmBlob }));
    };
    
    source.connect(this.scriptProcessor);
    this.scriptProcessor.connect(this.inputAudioContext.destination);
  }

  private async handleServerMessage(message: LiveServerMessage): Promise<void> {
    if (!this.callbacks || !message.serverContent) return;
    
    // Handle transcriptions
    if (message.serverContent.inputTranscription) {
      this.callbacks.onTranscriptionUpdate({ 
        text: message.serverContent.inputTranscription.text || '',
        isFinal: !!message.serverContent.inputTranscription.finished,
        speaker: 'user' 
      });
    }

    if (message.serverContent.outputTranscription) {
      const { text, finished } = message.serverContent.outputTranscription;
      if (text) this.currentAiResponseForTurn += text;
      this.callbacks.onTranscriptionUpdate({ 
        text: text || '', isFinal: !!finished, speaker: 'ai' 
      });
    }
    
    // Handle tool-related parts
    if (message.serverContent.modelTurn?.parts) {
      for (const part of message.serverContent.modelTurn.parts) {
        // Log raw parts for debugging
        console.log("📦 [DEBUG] Raw message part received in service:", JSON.stringify(part, null, 2));

        // Check for intermediate search status
        if (part.codeExecutionResult?.output?.includes('Google Search')) {
          if (!this.isSearchActiveInTurn) {
            this.isSearchActiveInTurn = true;
            this.callbacks.onToolCall?.({ toolName: 'google_search', result: { inProgress: true } });
          }
          continue; // Skip aggregation for this part
        }

        // Aggregate code execution parts
        if (part.executableCode?.code) {
            if (!this.currentCodeExecutionResult) this.currentCodeExecutionResult = {};
            this.currentCodeExecutionResult.code = part.executableCode.code;
        }
        if (part.codeExecutionResult) {
            if (!this.currentCodeExecutionResult) this.currentCodeExecutionResult = {};
            this.currentCodeExecutionResult.output = part.codeExecutionResult.output;
            this.currentCodeExecutionResult.outcome = part.codeExecutionResult.outcome;
        }
        if (part.inlineData?.mimeType?.startsWith('image/') && !this.isSearchActiveInTurn) {
            if (!this.currentCodeExecutionResult) this.currentCodeExecutionResult = {};
            this.currentCodeExecutionResult.image = part.inlineData.data;
        }
      }
    }
    
    // Handle final search result (grounding metadata)
    if (message.serverContent.groundingMetadata) {
      this.isSearchActiveInTurn = true; 
      this.callbacks.onToolCall?.({
        toolName: 'google_search',
        result: {
          aiResponse: this.currentAiResponseForTurn,
          ...message.serverContent.groundingMetadata
        }
      });
    }
    
    // At the end of the turn, send any aggregated tool calls and reset state
    if (message.serverContent.turnComplete) {
        if (this.currentCodeExecutionResult && Object.keys(this.currentCodeExecutionResult).length > 0) {
            console.log("📦 [DEBUG] Sending complete code execution tool call:", this.currentCodeExecutionResult);
            this.callbacks.onToolCall?.({
                toolName: 'code_execution',
                result: this.currentCodeExecutionResult,
            });
        }
        this.resetTurnState();
    }
    
    // Handle audio playback
    const audioPart = message.serverContent.modelTurn?.parts?.find(p => p.inlineData?.mimeType?.startsWith('audio/'));
    if (audioPart?.inlineData?.data) {
      this.playAudio(audioPart.inlineData.data);
    }

    if (message.serverContent.interrupted) {
      this.playingSources.forEach(source => source.stop());
      this.playingSources.clear();
      this.nextStartTime = 0;
    }
  }

  private async playAudio(base64Audio: string): Promise<void> {
    if (!this.outputAudioContext || !this.outputGainNode) return;
    if (this.outputAudioContext.state === 'suspended') await this.outputAudioContext.resume();
    
    this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);
    const audioBytes = decode(base64Audio);
    const audioBuffer = await decodeAudioData(audioBytes, this.outputAudioContext, 24000, 1);

    if (audioBuffer.length > 0) {
      const source = this.outputAudioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.outputGainNode);
      source.onended = () => { this.playingSources.delete(source); };
      source.start(this.nextStartTime);
      this.nextStartTime += audioBuffer.duration;
      this.playingSources.add(source);
    }
  }
}

export const geminiLiveService = new GeminiLiveService();