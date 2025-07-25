import * as Tone from 'tone';
import type { SequenceItem } from '../types';
import { getChordNotes } from './chord-utils';
import { INDEX_TO_SHARP_NAME } from '../constants';

let isAudioReady = false;

// --- CAMBIO AQUÍ ---
// Nueva función exportada para inicializar el contexto de audio.
// Debe ser llamada desde un evento de usuario (ej. click).
export async function initAudio(): Promise<void> {
    if (isAudioReady) return;
    try {
        await Tone.start();
        isAudioReady = true;
        console.log('Audio context started successfully.');
    } catch (e) {
        console.error('Failed to start audio context:', e);
    }
}

export class AudioEngine {
    private sampler: Tone.Sampler | null = null;
    private isSamplerReady = false;
    private isInitializing = false;

    constructor() {
        // La inicialización del sampler ahora se dispara en el constructor,
        // pero no bloquea. Se cargará en segundo plano.
        this.initSampler();
    }

    // Método privado para cargar el sampler.
    private async initSampler(): Promise<void> {
        if (this.isSamplerReady || this.isInitializing) return;
        
        this.isInitializing = true;
        try {
            this.sampler = new Tone.Sampler({
                urls: {
                    A2: "A2.mp3", C3: "C3.mp3", "D#3": "Ds3.mp3", "F#3": "Fs3.mp3", 
                    A3: "A3.mp3", C4: "C4.mp3", "D#4": "Ds4.mp3", "F#4": "Fs4.mp3", 
                    A4: "A4.mp3", C5: "C5.mp3", "D#5": "Ds5.mp3", "F#5": "Fs5.mp3",
                    A5: "A5.mp3",
                },
                release: 1,
                baseUrl: "https://tonejs.github.io/audio/salamander/",
            }).toDestination();
            
            await Tone.loaded();
            this.isSamplerReady = true;
            console.log('Audio engine (Tone.js) sampler ready.');
        } catch (e) {
            console.error("Tone.js sampler failed to initialize:", e);
        } finally {
            this.isInitializing = false;
        }
    }

    // El método `ensureReady` ahora solo comprueba que el sampler esté cargado.
    private async ensureReady(): Promise<boolean> {
        // --- CAMBIO AQUÍ ---
        // Si el contexto de audio global no está listo, no podemos continuar.
        if (!isAudioReady) {
            console.warn("Audio context not initialized. User interaction needed.");
            return false;
        }

        if (this.isSamplerReady) return true;
        
        // Si el sampler todavía se está cargando, esperamos.
        if (this.isInitializing) {
            return new Promise(resolve => {
                const interval = setInterval(() => {
                    if (this.isSamplerReady) {
                        clearInterval(interval);
                        resolve(true);
                    }
                }, 100);
            });
        }
        
        // Si por alguna razón no se inició la carga, la iniciamos ahora.
        await this.initSampler();
        return this.isSamplerReady;
    }
    
    private convertNoteIndexToToneJSNote(noteIndex: number): string {
        const octave = Math.floor(noteIndex / 12);
        const noteName = INDEX_TO_SHARP_NAME[noteIndex % 12];
        return `${noteName}${octave}`;
    }

    public async playNote(noteIndex: number, duration = 1.0): Promise<void> {
        if (!(await this.ensureReady()) || !this.sampler) return;

        const noteName = this.convertNoteIndexToToneJSNote(noteIndex);
        this.sampler.triggerAttackRelease(noteName, duration);
    }
    
    public async playChord(item: SequenceItem, transpositionOffset: number = 0): Promise<void> {
        if (!(await this.ensureReady()) || !this.sampler) return;

        const { notesToPress, bassNoteIndex } = getChordNotes(item, transpositionOffset);
        
        const allNotesToPlay = [...notesToPress];
        if (bassNoteIndex !== null) {
            allNotesToPlay.push(bassNoteIndex);
        }
        
        const notesAsStrings = allNotesToPlay.map(note => this.convertNoteIndexToToneJSNote(note));
        
        this.sampler.triggerAttackRelease(notesAsStrings, 2.0);
    }
}
