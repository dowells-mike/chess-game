import React, { useState, useEffect, useRef } from 'react';
import { Settings, Volume2, VolumeX, Music } from 'lucide-react';
import * as SwitchPrimitives from "@radix-ui/react-switch";
import { SOUNDS } from './sounds';

// switch definition
const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className="peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input bg-gray-200 data-[state=checked]:bg-blue-600"
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb className="pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0" />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;


interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSettings: SoundSettings;
  onSettingsChange: (settings: SoundSettings) => void;
}


export interface SoundSettings {
  masterVolume: number;
  moveVolume: number;
  checkVolume: number;
  musicVolume: number;
  isMusicEnabled: boolean;
  areSoundEffectsEnabled: boolean;
}


const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  initialSettings,
  onSettingsChange
}) => {
  const [settings, setSettings] = useState<SoundSettings>(initialSettings);
  const musicRef = useRef<HTMLAudioElement>(null);


  useEffect(() => {
    if (musicRef.current) {
      musicRef.current.volume = settings.isMusicEnabled 
        ? settings.musicVolume * settings.masterVolume 
        : 0;
      
      settings.isMusicEnabled 
        ? musicRef.current.play() 
        : musicRef.current.pause();
    }
  }, [
    settings.isMusicEnabled, 
    settings.musicVolume, 
    settings.masterVolume
  ]);


  const handleVolumeChange = (key: keyof SoundSettings, value: number) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    onSettingsChange(newSettings);
  };


  const handleToggleMusic = () => {
    setSettings(prev => ({ 
      ...prev, 
      isMusicEnabled: !prev.isMusicEnabled 
    }));
  };


  const handleToggleSoundEffects = () => {
    setSettings(prev => ({ 
      ...prev, 
      areSoundEffectsEnabled: !prev.areSoundEffectsEnabled 
    }));
  };


  if (!isOpen) return null;


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-8 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold flex items-center">
            <Settings className="mr-2" /> Game Settings
          </h2>
          <button 
            onClick={onClose}
            className="text-red-500 hover:bg-red-100 rounded-full p-2"
          >
            Close
          </button>
        </div>


        {/* Master Volume */}
        <div className="mb-4">
          <label className="flex items-center justify-between mb-2">
            <span>Master Volume</span>
            {settings.masterVolume === 0 ? <VolumeX /> : <Volume2 />}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={settings.masterVolume}
            onChange={(e) => handleVolumeChange('masterVolume', parseFloat(e.target.value))}
            className="w-full"
          />
        </div>


        {/* Sound Effects Volume */}
        <div className="mb-4">
          <label className="flex items-center justify-between mb-2">
            <span>Sound Effects</span>
            <Switch 
              checked={settings.areSoundEffectsEnabled}
              onCheckedChange={handleToggleSoundEffects}
            />
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={settings.moveVolume}
            onChange={(e) => handleVolumeChange('moveVolume', parseFloat(e.target.value))}
            disabled={!settings.areSoundEffectsEnabled}
            className="w-full"
          />
        </div>


        {/* Music */}
        <div className="mb-4">
          <label className="flex items-center justify-between mb-2">
            <span className="flex items-center">
              <Music className="mr-2" /> Background Music
            </span>
            <Switch 
              checked={settings.isMusicEnabled}
              onCheckedChange={handleToggleMusic}
            />
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={settings.musicVolume}
            onChange={(e) => handleVolumeChange('musicVolume', parseFloat(e.target.value))}
            disabled={!settings.isMusicEnabled}
            className="w-full"
          />
        </div>


        <audio 
          ref={musicRef} 
          src={SOUNDS.BACKGROUND_MUSIC} 
          loop 
        />
      </div>
    </div>
  );
};


export default SettingsModal;