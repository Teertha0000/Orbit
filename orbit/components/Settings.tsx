import React, { useState, useEffect } from 'react';

interface SettingsData {
  apiKey: string;
  modelName: string;
  language: string;
  temperature: number;
  maxOutputTokens: number;
  systemInstruction: string;
  voiceName: string;
  enableGoogleSearch: boolean;
}

const DEFAULT_SETTINGS: SettingsData = {
  apiKey: '',
  modelName: 'gemini-2.5-flash-native-audio-preview-09-2025',
  language: 'eng',
  temperature: 0.7,
  maxOutputTokens: 8192,
  systemInstruction: 'You are Orbit, a friendly and helpful voice assistant. You can run Python code to solve problems. When asked to create a plot or graph, you must use the Matplotlib library to generate and display it.',
  voiceName: 'Puck',
  enableGoogleSearch: true
};

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsChange?: (settings: SettingsData) => void;
}

export const Settings: React.FC<SettingsProps> = ({ isOpen, onClose, onSettingsChange }) => {
  const [settings, setSettings] = useState<SettingsData>(DEFAULT_SETTINGS);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [apiKeySaveStatus, setApiKeySaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [showApiKey, setShowApiKey] = useState(false);

  // Load settings from localStorage and API key from Electron on mount
  useEffect(() => {
    const loadAllSettings = async () => {
      // Load regular settings from localStorage
      const savedSettings = localStorage.getItem('orbitalVoiceSettings');
      let parsedSettings = { ...DEFAULT_SETTINGS };
      
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          // Merge with defaults, excluding apiKey from localStorage
          const { apiKey, ...rest } = parsed;
          parsedSettings = { ...DEFAULT_SETTINGS, ...rest };
        } catch (e) {
          console.error('Failed to parse saved settings:', e);
        }
      }
      
      // Load API key from Electron if available
      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        try {
          const savedApiKey = await (window as any).electronAPI.getApiKey();
          if (savedApiKey) {
            parsedSettings.apiKey = savedApiKey;
            console.log('✅ Loaded API key from Electron storage');
          }
        } catch (e) {
          console.error('Failed to load API key from Electron:', e);
        }
      }
      
      setSettings(parsedSettings);
    };
    
    loadAllSettings();
  }, []);

  const updateSetting = <K extends keyof SettingsData>(key: K, value: SettingsData[K]) => {
    setSettings(prev => {
      const newSettings = { ...prev, [key]: value };
      setHasUnsavedChanges(true);
      return newSettings;
    });
  };

  const handleSave = async () => {
    setApiKeySaveStatus('saving');
    
    try {
      // Save API key to Electron storage if in Electron environment
      if (typeof window !== 'undefined' && (window as any).electronAPI && settings.apiKey) {
        const success = await (window as any).electronAPI.setApiKey(settings.apiKey);
        if (!success) {
          throw new Error('Failed to save API key to Electron storage');
        }
        console.log('✅ API key saved to Electron storage');
      }
      
      // Save other settings to localStorage (excluding API key for security)
      const { apiKey, ...settingsWithoutApiKey } = settings;
      localStorage.setItem('orbitalVoiceSettings', JSON.stringify(settingsWithoutApiKey));
      console.log('✅ Settings saved to localStorage:', settingsWithoutApiKey);
      
      // Notify parent component
      if (onSettingsChange) {
        onSettingsChange(settings);
      }
      
      setApiKeySaveStatus('success');
      setHasUnsavedChanges(false);
      
      // Reset status after 2 seconds
      setTimeout(() => setApiKeySaveStatus('idle'), 2000);
      
      // Close after successful save
      setTimeout(() => onClose(), 500);
    } catch (error) {
      console.error('❌ Failed to save settings:', error);
      setApiKeySaveStatus('error');
      setTimeout(() => setApiKeySaveStatus('idle'), 3000);
    }
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all settings to default?')) {
      setSettings(DEFAULT_SETTINGS);
      setHasUnsavedChanges(true);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      {/* Settings Modal */}
      <div 
        className="w-full max-w-2xl bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 overflow-hidden"
        style={{ 
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
          maxHeight: '90vh'
        }}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Settings</h2>
            {hasUnsavedChanges && (
              <p className="text-yellow-400 text-xs mt-1 flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Unsaved changes
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 overflow-y-auto scrollbar-hide" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          <div className="space-y-6">
            
            {/* API Key Section - CRITICAL - First Setting */}
            <div className="space-y-3 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-400/30 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-white font-bold text-base flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  Google Gemini API Key
                </label>
                {apiKeySaveStatus === 'success' && (
                  <span className="text-green-400 text-xs font-semibold flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Saved!
                  </span>
                )}
                {apiKeySaveStatus === 'error' && (
                  <span className="text-red-400 text-xs font-semibold">❌ Error saving</span>
                )}
              </div>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={settings.apiKey}
                  onChange={(e) => updateSetting('apiKey', e.target.value)}
                  placeholder="Enter your API key (e.g., AIzaSy...)"
                  className="w-full px-4 py-3 pr-12 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  {showApiKey ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-white/10"></div>
            
            {/* Model Selection */}
            <div className="space-y-3">
              <label className="block text-white font-semibold text-sm">
                Model Name
              </label>
              <select
                value={settings.modelName}
                onChange={(e) => updateSetting('modelName', e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/30 transition-all cursor-pointer"
              >
                <option value="gemini-2.5-flash-native-audio-preview-09-2025" className="bg-gray-800">gemini-2.5-flash-native-audio-preview-09-2025 (Recommended)</option>
              </select>
              <p className="text-gray-400 text-xs">This model is optimized for real-time voice conversations.</p>
            </div>

            {/* Language Selection */}
            <div className="space-y-3">
              <label className="block text-white font-semibold text-sm">
                Language
              </label>
              <select
                value={settings.language}
                onChange={(e) => updateSetting('language', e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/30 transition-all cursor-pointer"
              >
                <option value="eng" className="bg-gray-800">English (Eng)</option>
                <option value="esp" className="bg-gray-800">Spanish (Esp)</option>
                <option value="fra" className="bg-gray-800">French (Fra)</option>
                <option value="deu" className="bg-gray-800">German (Deu)</option>
                <option value="ben" className="bg-gray-800">Bengali (Ben)</option>
                <option value="hin" className="bg-gray-800">Hindi (Hin)</option>
                <option value="zho" className="bg-gray-800">Chinese (Zho)</option>
                <option value="jpn" className="bg-gray-800">Japanese (Jpn)</option>
              </select>
            </div>

            {/* Temperature Control */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-white font-semibold text-sm">
                  Temperature
                </label>
                <span className="text-white/70 text-sm">{settings.temperature.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={settings.temperature}
                onChange={(e) => updateSetting('temperature', Number(e.target.value))}
                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer slider"
              />
              <p className="text-gray-400 text-xs">Higher values make output more random, lower values more deterministic</p>
            </div>

            {/* Max Output Tokens */}
            <div className="space-y-3">
              <label className="block text-white font-semibold text-sm">
                Max Output Tokens
              </label>
              <input
                type="number"
                min="1"
                max="32768"
                value={settings.maxOutputTokens}
                onChange={(e) => updateSetting('maxOutputTokens', Number(e.target.value))}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/30 transition-all"
              />
              <p className="text-gray-400 text-xs">Maximum number of tokens to generate (1-32768)</p>
            </div>

            {/* System Instruction */}
            <div className="space-y-3">
              <label className="block text-white font-semibold text-sm">
                System Instruction / Prompt
              </label>
              <textarea
                value={settings.systemInstruction}
                onChange={(e) => updateSetting('systemInstruction', e.target.value)}
                rows={4}
                placeholder="Enter system instructions for the AI..."
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all resize-none"
              />
            </div>

            {/* Voice Name */}
            <div className="space-y-3">
              <label className="block text-white font-semibold text-sm">
                Voice Name
              </label>
              <select
                value={settings.voiceName}
                onChange={(e) => updateSetting('voiceName', e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/30 transition-all cursor-pointer"
              >
                <option value="Zephyr" className="bg-gray-800">Zephyr (Bright)</option>
                <option value="Puck" className="bg-gray-800">Puck (Upbeat)</option>
                <option value="Charon" className="bg-gray-800">Charon (Informative)</option>
                <option value="Kore" className="bg-gray-800">Kore (Firm)</option>
                <option value="Fenrir" className="bg-gray-800">Fenrir (Excitable)</option>
                <option value="Leda" className="bg-gray-800">Leda (Youthful)</option>
                <option value="Orus" className="bg-gray-800">Orus (Firm)</option>
                <option value="Aoede" className="bg-gray-800">Aoede (Breezy)</option>
                <option value="Callirrhoe" className="bg-gray-800">Callirrhoe (Easy-going)</option>
                <option value="Autonoe" className="bg-gray-800">Autonoe (Bright)</option>
                <option value="Enceladus" className="bg-gray-800">Enceladus (Breathy)</option>
                <option value="Iapetus" className="bg-gray-800">Iapetus (Clear)</option>
                <option value="Umbriel" className="bg-gray-800">Umbriel (Easy-going)</option>
                <option value="Algieba" className="bg-gray-800">Algieba (Smooth)</option>
                <option value="Despina" className="bg-gray-800">Despina (Smooth)</option>
                <option value="Erinome" className="bg-gray-800">Erinome (Clear)</option>
                <option value="Algenib" className="bg-gray-800">Algenib (Gravelly)</option>
                <option value="Rasalgethi" className="bg-gray-800">Rasalgethi (Informative)</option>
                <option value="Laomedeia" className="bg-gray-800">Laomedeia (Upbeat)</option>
                <option value="Achernar" className="bg-gray-800">Achernar (Soft)</option>
                <option value="Alnilam" className="bg-gray-800">Alnilam (Firm)</option>
                <option value="Schedar" className="bg-gray-800">Schedar (Even)</option>
                <option value="Gacrux" className="bg-gray-800">Gacrux (Mature)</option>
                <option value="Pulcherrima" className="bg-gray-800">Pulcherrima (Forward)</option>
                <option value="Achird" className="bg-gray-800">Achird (Friendly)</option>
                <option value="Zubenelgenubi" className="bg-gray-800">Zubenelgenubi (Casual)</option>
                <option value="Vindemiatrix" className="bg-gray-800">Vindemiatrix (Gentle)</option>
                <option value="Sadachbia" className="bg-gray-800">Sadachbia (Lively)</option>
                <option value="Sadaltager" className="bg-gray-800">Sadaltager (Knowledgeable)</option>
                <option value="Sulafat" className="bg-gray-800">Sulafat (Warm)</option>
              </select>
            </div>

            {/* Google Search Toggle */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-white font-semibold text-sm">
                    Google Search Grounding
                  </label>
                  <p className="text-gray-400 text-xs mt-1">
                    Connect to real-time web content for accurate, cited answers
                  </p>
                </div>
                <button
                  onClick={() => updateSetting('enableGoogleSearch', !settings.enableGoogleSearch)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.enableGoogleSearch ? 'bg-blue-500' : 'bg-white/20'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.enableGoogleSearch ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <p className="text-gray-400 text-xs">
                When enabled, Orbit can search the web for real-time information and provide citations
              </p>
            </div>

            {/* Divider */}
            <div className="border-t border-white/10 pt-6">
              <h3 className="text-white font-semibold text-sm mb-3">About</h3>
              <div className="space-y-2 text-sm text-white/70">
                <p>Orbit Voice Assistant v1.0.0</p>
                <p>Powered by Google Gemini AI</p>
                <p className="text-xs text-white/50 mt-4">
                  Built with React, TypeScript, and Spline
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-4 border-t border-white/10">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <button
              onClick={handleReset}
              className="px-5 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 transition-all font-medium text-sm"
            >
              Reset to Default
            </button>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-all text-sm"
              >
                Close
              </button>
              <button
                onClick={handleSave}
                disabled={!hasUnsavedChanges || apiKeySaveStatus === 'saving'}
                className={`px-5 py-2.5 rounded-xl font-semibold transition-all text-sm flex items-center gap-2 ${
                  hasUnsavedChanges && apiKeySaveStatus !== 'saving'
                    ? 'bg-white/20 hover:bg-white/30 text-white cursor-pointer'
                    : 'bg-white/5 text-white/40 cursor-not-allowed'
                }`}
              >
                {apiKeySaveStatus === 'saving' ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : apiKeySaveStatus === 'success' ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Saved!
                  </>
                ) : hasUnsavedChanges ? (
                  'Save Changes'
                ) : (
                  'No Changes'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Utility function to get current settings (excluding API key for security)
export const getSettings = (): SettingsData => {
  const savedSettings = localStorage.getItem('orbitalVoiceSettings');
  if (savedSettings) {
    try {
      const parsed = JSON.parse(savedSettings);
      // Always exclude apiKey from localStorage reads
      const { apiKey, ...rest } = parsed;
      return { ...DEFAULT_SETTINGS, ...rest, apiKey: '' };
    } catch (e) {
      console.error('Failed to parse saved settings:', e);
    }
  }
  return DEFAULT_SETTINGS;
};

// Export types
export type { SettingsData };