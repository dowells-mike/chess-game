import React, { useState, useEffect } from 'react';
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

  // Update local settings when parent settings change
  useEffect(() => {
    setSettings(initialSettings);
  }, [initialSettings]);

  const handleVolumeChange = (key: keyof SoundSettings, value: number) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    onSettingsChange(newSettings);
  };


  const handleToggleMusic = () => {
    const newSettings = { 
      ...settings, 
      isMusicEnabled: !settings.isMusicEnabled 
    };
    setSettings(newSettings);
    onSettingsChange(newSettings);
  };


  const handleToggleSoundEffects = () => {
    const newSettings = { 
      ...settings, 
      areSoundEffectsEnabled: !settings.areSoundEffectsEnabled 
    };
    setSettings(newSettings);
    onSettingsChange(newSettings);
  };


  if (!isOpen) return null;


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg p-4 lg:p-8 w-full max-w-md">
        <div className="flex justify-between items-center mb-4 lg:mb-6">
          <h2 className="text-xl lg:text-2xl font-bold flex items-center">
            <Settings className="mr-2 w-5 h-5 lg:w-6 lg:h-6" /> Game Settings
          </h2>
          <button 
            onClick={onClose}
            className="text-red-500 hover:bg-red-100 rounded-full p-2 text-sm lg:text-base"
          >
            Close
          </button>
        </div>


        {/* Master Volume */}
        <div className="mb-3 lg:mb-4">
          <label className="flex items-center justify-between mb-2">
            <span className="text-sm lg:text-base">Master Volume</span>
            {settings.masterVolume === 0 ? <VolumeX className="w-4 h-4 lg:w-5 lg:h-5" /> : <Volume2 className="w-4 h-4 lg:w-5 lg:h-5" />}
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
        <div className="mb-3 lg:mb-4">
          <label className="flex items-center justify-between mb-2">
            <span className="text-sm lg:text-base">Sound Effects</span>
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
        <div className="mb-3 lg:mb-4">
          <label className="flex items-center justify-between mb-2">
            <span className="flex items-center text-sm lg:text-base">
              <Music className="mr-2 w-4 h-4 lg:w-5 lg:h-5" /> Background Music
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
      </div>
    </div>
  );
};


export default SettingsModal;