// extractor.ts (Versión Final y Corregida)

// CAMBIO: Eliminamos 'recalculateChordLayout' de la importación
import { applyTransposition, parseSongText } from '../core/chord-utils';
import { createSongSheet } from '../core/piano-renderer'; 
import type { ProcessedSong, SequenceItem, ShowInspectorFn } from '../types';
import type { AudioEngine } from '../core/audio';

interface ExtractorDOMElements {
    songInput: HTMLTextAreaElement;
    processSongBtn: HTMLButtonElement;
    addToComposerBtn: HTMLButtonElement;
    loader: HTMLElement;
    songOutput: HTMLElement;
    transpositionControls: HTMLElement;
    transposeUpBtn: HTMLButtonElement;
    transposeDownBtn: HTMLButtonElement;
    transpositionDisplay: HTMLElement;
}

interface ExtractorCallbacks {
    showInspector: ShowInspectorFn;
    addToComposer: (song: ProcessedSong) => void;
}

export class Extractor {
    private elements: ExtractorDOMElements;
    private callbacks: ExtractorCallbacks;
    private audioEngine: AudioEngine;
    private originalParsedSong: ProcessedSong | null = null;
    private currentDisplayedSong: ProcessedSong | null = null;
    private transpositionOffset = 0;
    private nextChordId = 0;

    constructor(
        elements: ExtractorDOMElements, 
        callbacks: ExtractorCallbacks,
        audioEngine: AudioEngine
    ) {
        this.elements = elements;
        this.callbacks = callbacks;
        this.audioEngine = audioEngine;
    }

    public init(): void {
        this.addEventListeners();
    }

    private addEventListeners(): void {
        this.elements.processSongBtn.addEventListener('click', this.handleProcessSong);
        this.elements.addToComposerBtn.addEventListener('click', this.handleAddToComposer);
        this.elements.transposeUpBtn.addEventListener('click', () => this.handleTranspose(1));
        this.elements.transposeDownBtn.addEventListener('click', () => this.handleTranspose(-1));
    }

    private handleProcessSong = (): void => {
        const songText = this.elements.songInput.value;
        if (!songText.trim()) return;
        this.elements.loader.style.display = 'flex';
        this.elements.songOutput.innerHTML = '';
        this.elements.addToComposerBtn.disabled = true;
        this.elements.processSongBtn.disabled = true;
        this.elements.transpositionControls.style.display = 'none';
        
        setTimeout(() => {
            try {
                this.originalParsedSong = parseSongText(songText);
                
                // CAMBIO: Añadimos una comprobación para asegurar que la canción se procesó bien
                if (!this.originalParsedSong) {
                    throw new Error("La canción no pudo ser procesada.");
                }

                this.nextChordId = 0;
                this.originalParsedSong.lines.forEach(line => {
                    line.chords.forEach(songChord => {
                        if (!songChord.isAnnotation && songChord.chord) {
                            songChord.chord.id = this.nextChordId++;
                        }
                    });
                });
                
                this.transpositionOffset = 0;
                this.updateDisplayedSong();
                this.elements.addToComposerBtn.disabled = !this.currentDisplayedSong || this.currentDisplayedSong.allChords.length === 0;
                this.elements.transpositionControls.style.display = 'flex';
            } catch (error) {
                console.error("Error al procesar la canción:", error);
                this.elements.songOutput.textContent = "Hubo un error al analizar la canción.";
            } finally {
                this.elements.loader.style.display = 'none';
                this.elements.processSongBtn.disabled = false;
            }
        }, 50);
    }

    private updateDisplayedSong = (): void => {
        if (!this.originalParsedSong) return;
        
        const songToTranspose = JSON.parse(JSON.stringify(this.originalParsedSong));
        this.currentDisplayedSong = applyTransposition(songToTranspose, this.transpositionOffset);
        
        // CAMBIO: Comprobamos que la canción a mostrar no sea null antes de usarla
        if (this.currentDisplayedSong) {
            createSongSheet(this.elements.songOutput, this.currentDisplayedSong.lines, {
                onShortClick: this.onShortClick,
                onLongClick: this.onLongClick,
            });
        }
        
        if (this.transpositionOffset === 0) {
            this.elements.transpositionDisplay.textContent = 'Tonalidad Original';
        } else {
            const sign = this.transpositionOffset > 0 ? '+' : '';
            this.elements.transpositionDisplay.textContent = `${sign}${this.transpositionOffset} Semitonos`;
        }
    }

    private handleAddToComposer = (): void => {
        // CAMBIO: Tu comprobación original ya era correcta, la mantenemos.
        if (this.currentDisplayedSong) {
            this.callbacks.addToComposer(JSON.parse(JSON.stringify(this.currentDisplayedSong)));
        }
    }

    private handleTranspose = (semitones: number): void => {
        if (!this.originalParsedSong) return;
        this.transpositionOffset += semitones;
        this.updateDisplayedSong();
    }

    private onShortClick = (item: SequenceItem): void => {
        this.audioEngine.playChord(item);
    }

    private onLongClick = (item: SequenceItem): void => {
        // CAMBIO: Añadimos los callbacks vacíos para que coincida con el tipo ShowInspectorFn
        this.callbacks.showInspector(item, {});
    }
}