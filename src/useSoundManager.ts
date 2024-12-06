import { useState, useEffect, useRef } from 'react';
import { SOUNDS } from './sounds';
import { SoundSettings } from './SettingsModal';


export const useSoundManager = (settings: SoundSettings) => {
  const moveSound = useRef(new Audio(SOUNDS.MOVE));
  const checkSound = useRef(new Audio(SOUNDS.CHECK));
  const checkmateSound = useRef(new Audio(SOUNDS.CHECKMATE));
  const turnSwitchSound = useRef(new Audio(SOUNDS.TURN_SWITCH));


  const playSound = (audio: HTMLAudioElement, volume: number) => {
    if (!settings.areSoundEffectsEnabled) return;
    
    audio.volume = volume * settings.masterVolume;
    audio.currentTime = 0;
    audio.play().catch(error => console.error('Error playing sound:', error));
  };


  return {
    playMoveSound: () => playSound(moveSound.current, settings.moveVolume),
    playCheckSound: () => playSound(checkSound.current, settings.moveVolume),
    playCheckmateSound: () => playSound(checkmateSound.current, settings.moveVolume),
    playTurnSwitchSound: () => playSound(turnSwitchSound.current, settings.moveVolume),
  };
};