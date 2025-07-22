import * as Tone from 'tone';
import type { SequenceItem } from '../types';
import { getChordNotes } from './chord-utils';
import { INDEX_TO_DISPLAY_NAME } from '../constants';

export class AudioEngine {
    private sampler: Tone.Sampler | null = null;
    private isReady = false;
    private isInitializing = false;

    // This method ensures the audio context is started and the sampler is loaded.
    // It's called automatically before any sound is played.
    private async ensureReady(): Promise<boolean> {
        // If already ready, do nothing.
        if (this.isReady) return true;
        
        // If it's already initializing in the background, wait for it to finish.
        if (this.isInitializing) {
            return new Promise(resolve => {
                const interval = setInterval(() => {
                    if (this.isReady) {
                        clearInterval(interval);
                        resolve(true);
                    }
                }, 100);
            });
        }
        
        // Start initialization.
        this.isInitializing = true;
        
        try {
            // Tone.start() must be called after a user gesture (e.g., click).
            // It returns a promise that resolves when the audio context is started.
            await Tone.start();

            // Create the sampler with a map of notes to audio files.
            this.sampler = new Tone.Sampler({
                urls: {
                    A2: "A2.mp3", C3: "C3.mp3", "D#3": "Ds3.mp3", "F#3": "Fs3.mp3", 
                    A3: "A3.mp3", C4: "C4.mp3", "D#4": "Ds4.mp3", "F#4": "Fs4.mp3", 
                    A4: "A4.mp3", C5: "C5.mp3", "D#5": "Ds5.mp3", "F#5": "Fs5.mp3",
                    A5: "A5.mp3",
                },
                release: 1,
                // Use Tone.js's hosted samples for convenience.
                baseUrl: "https://tonejs.github.io/audio/salamander/",
            }).toDestination();
            
            // Wait for all the samples to be loaded.
            await Tone.loaded();

            this.isReady = true;
            console.log('Audio engine (Tone.js) ready.');
            
        } catch (e) {
            console.error("Tone.js failed to initialize:", e);
            this.isReady = false;
        } finally {
            this.isInitializing = false;
        }
        
        return this.isReady;
    }
    
    // Converts our internal numeric note index (e.g., 60) to a Tone.js note name (e.g., "C4").
    private convertNoteIndexToToneJSNote(noteIndex: number): string {
        const octave = Math.floor(noteIndex / 12);
        const noteName = INDEX_TO_DISPLAY_NAME[noteIndex % 12];
        return `${noteName}${octave}`;
    }

    public async playNote(noteIndex: number, duration = 1.0): Promise<void> {
        if (!(await this.ensureReady()) || !this.sampler) return;

        const noteName = this.convertNoteIndexToToneJSNote(noteIndex);
        this.sampler.triggerAttackRelease(noteName, duration);
    }
    
    public async playChord(item: SequenceItem): Promise<void> {
        if (!(await this.ensureReady()) || !this.sampler) return;

        // --- CORRECCIÓN AQUÍ ---
        // Se eliminó el segundo argumento 'true' de la llamada a getChordNotes.
        const { notesToPress, bassNoteIndex } = getChordNotes(item);
        
        const allNotesToPlay = [...notesToPress];
        if (bassNoteIndex !== null) {
            allNotesToPlay.push(bassNoteIndex);
        }
        
        // Convert all numeric indices to Tone.js note names.
        const notesAsStrings = allNotesToPlay.map(this.convertNoteIndexToToneJSNote);
        
        // Tone.js's sampler can play an array of notes at once.
        this.sampler.triggerAttackRelease(notesAsStrings, 2.0);
    }
}