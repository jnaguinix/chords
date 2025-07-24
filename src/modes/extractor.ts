import { applyTransposition, parseSongText, formatChordName } from '../core/chord-utils';
import { createSongSheet } from '../core/piano-renderer'; 
import type { ProcessedSong, SequenceItem, ShowInspectorFn } from '../types';
import type { AudioEngine } from '../core/audio';

interface ExtractorElements {
    songInput: HTMLTextAreaElement;
    processSongBtn: HTMLButtonElement;
    clearExtractorBtn: HTMLButtonElement;
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
    private elements: ExtractorElements;
    private callbacks: ExtractorCallbacks;
    private audioEngine: AudioEngine;
    private originalSong: ProcessedSong | null = null;
    private displayedSong: ProcessedSong | null = null;
    private transpositionOffset = 0;

    constructor(
        elements: ExtractorElements, 
        callbacks: ExtractorCallbacks,
        audioEngine: AudioEngine
    ) {
        this.elements = elements;
        this.callbacks = callbacks;
        this.audioEngine = audioEngine;
    }

    public init(): void {
        this.elements.processSongBtn.addEventListener('click', this.handleProcessSong);
        this.elements.addToComposerBtn.addEventListener('click', this.handleAddToComposer);
        this.elements.clearExtractorBtn.addEventListener('click', this.handleClearExtractor);
        this.elements.transposeUpBtn.addEventListener('click', () => this.handleTranspose(1));
        this.elements.transposeDownBtn.addEventListener('click', () => this.handleTranspose(-1));
    }

    private handleProcessSong = (): void => {
        const songText = this.elements.songInput.value;
        if (!songText.trim()) return;
        this.elements.loader.style.display = 'flex';
        this.elements.songOutput.innerHTML = '';
        this.elements.addToComposerBtn.disabled = true;
        this.elements.transpositionControls.style.display = 'none';
        
        setTimeout(() => {
            try {
                this.originalSong = parseSongText(songText);
                
                if (this.originalSong) {
                    let idCounter = 0;
                    this.originalSong.allChords.forEach(chord => {
                        chord.id = idCounter++;
                    });
                }
                
                this.transpositionOffset = 0;
                this.updateAndRenderSong();

                if (this.originalSong && this.originalSong.allChords.length > 0) {
                    this.elements.addToComposerBtn.disabled = false;
                    this.elements.transpositionControls.style.display = 'flex';
                }
            } catch (error) {
                console.error("Error al procesar la canción:", error);
                this.elements.songOutput.textContent = "Hubo un error al analizar la canción.";
            } finally {
                this.elements.loader.style.display = 'none';
            }
        }, 50);
    }

    private handleClearExtractor = (): void => {
        this.elements.songInput.value = '';
        this.elements.songOutput.innerHTML = '';
        this.elements.transpositionControls.style.display = 'none';
        this.elements.addToComposerBtn.disabled = true;
        this.originalSong = null;
        this.displayedSong = null;
        this.transpositionOffset = 0;
    };

    private handleAddToComposer = (): void => {
        if (this.displayedSong) {
            this.callbacks.addToComposer(JSON.parse(JSON.stringify(this.displayedSong)));
        }
    }

    private handleTranspose = (semitones: number): void => {
        if (!this.originalSong) return;
        this.transpositionOffset += semitones;
        this.updateAndRenderSong();
    }

    private onShortClick = (item: SequenceItem): void => {
        this.audioEngine.playChord(item);
    }

    private onLongClick = (item: SequenceItem): void => {
        this.callbacks.showInspector(item, {});
    }

    private updateAndRenderSong(): void {
        if (!this.originalSong) return;
        
        const songToTranspose = JSON.parse(JSON.stringify(this.originalSong));
        this.displayedSong = applyTransposition(songToTranspose, this.transpositionOffset);
        
        this.elements.songOutput.innerHTML = '';
        if (this.displayedSong) {
            // --- FIX: Re-sincronizar el texto visual (raw) y las referencias ---
            
            // 1. Actualizamos el texto 'raw' de cada acorde usando los datos ya transpuestos.
            this.displayedSong.allChords.forEach(chord => {
                if (chord.rootNote && chord.type) {
                    chord.raw = formatChordName(chord, { style: 'short' });
                }
            });

            // 2. Re-sincronizamos las referencias para que las 'lines' usen los acordes actualizados.
            const transposedChordsMap = new Map(this.displayedSong.allChords.map(c => [c.id, c]));
            this.displayedSong.lines.forEach(line => {
                line.chords.forEach(songChord => {
                    if (songChord.chord && songChord.chord.id !== undefined) {
                        songChord.chord = transposedChordsMap.get(songChord.chord.id)!;
                    }
                });
            });
            // --- FIN DEL FIX ---

            createSongSheet(this.elements.songOutput, this.displayedSong.lines, {
                onShortClick: (item: SequenceItem) => this.onShortClick(item),
                onLongClick: (item: SequenceItem) => this.onLongClick(item),
                transposition: this.transpositionOffset,
            });
        }
        
        this.updateTranspositionDisplay();
    }

    private updateTranspositionDisplay(): void {
        if (this.transpositionOffset === 0) {
            this.elements.transpositionDisplay.textContent = 'Tonalidad Original';
        } else {
            const sign = this.transpositionOffset > 0 ? '+' : '';
            this.elements.transpositionDisplay.textContent = `${sign}${this.transpositionOffset} Semitonos`;
        }
    }
}
