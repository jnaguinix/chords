/*
================================================================================
|                                extractor.ts                                  |
|     (Confirmado como correcto. Ya utiliza la lógica centralizada.)           |
================================================================================
*/

import { parseSongText, transposeNote } from '../core/chord-utils';
import type { ProcessedSong, SequenceItem, ShowInspectorFn } from '../types';
import type { AudioEngine } from '../core/audio';
import { TranspositionManager } from '../core/transposition-manager';
import { SheetManager } from '../core/sheet-manager';

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
    
    private transpositionManager: TranspositionManager;
    private sheetManager: SheetManager;

    constructor(
        elements: ExtractorElements, 
        callbacks: ExtractorCallbacks,
        audioEngine: AudioEngine
    ) {
        this.elements = elements;
        this.callbacks = callbacks;
        this.audioEngine = audioEngine;

        // ANOTACIÓN: La inicialización de los managers es correcta.
        // El SheetManager se encargará de renderizar la partitura correctamente.
        this.transpositionManager = new TranspositionManager(
            this.elements.transpositionDisplay,
            () => this.sheetManager.render() 
        );

        this.sheetManager = new SheetManager({
            container: this.elements.songOutput,
            audioEngine: this.audioEngine,
            // ANOTACIÓN: Al hacer clic largo, se llama a la función centralizada showInspector.
            // La lógica del inspector la modificaremos en main.tsx.
            showInspector: this.callbacks.showInspector,
            getSong: () => this.originalSong, 
            getTransposition: () => this.transpositionManager.getOffset(),
            updateChord: (updatedItem) => {
                if (!this.originalSong || updatedItem.id === undefined) return;

                let found = false;
                for (const line of this.originalSong.lines) {
                    for (const songChord of line.chords) {
                        if (songChord.chord.id === updatedItem.id) {
                            songChord.chord = updatedItem;
                            found = true;
                            break;
                        }
                    }
                    if (found) break;
                }

                const index = this.originalSong.allChords.findIndex(c => c.id === updatedItem.id);
                if (index > -1) {
                    this.originalSong.allChords[index] = updatedItem;
                }

                this.sheetManager.render();
            },
            deleteChord: (itemToDelete) => {
                if (!this.originalSong || itemToDelete.id === undefined) return;
                this.originalSong.allChords = this.originalSong.allChords.filter(c => c.id !== itemToDelete.id);
                this.originalSong.lines.forEach(line => {
                    line.chords = line.chords.filter(sc => sc.chord.id !== itemToDelete.id);
                });
                this.sheetManager.render();
            }
        });
    }

    public init(): void {
        this.elements.processSongBtn.textContent = 'Analizar';
        this.elements.addToComposerBtn.textContent = 'Añadir al Compositor';
        this.elements.transposeUpBtn.textContent = '+';
        this.elements.transposeDownBtn.textContent = '-';

        this.elements.processSongBtn.addEventListener('click', this.handleProcessSong);
        this.elements.addToComposerBtn.addEventListener('click', this.handleAddToComposer);
        this.elements.clearExtractorBtn.addEventListener('click', this.handleClearExtractor);
        this.elements.transposeUpBtn.addEventListener('click', () => this.transpositionManager.up());
        this.elements.transposeDownBtn.addEventListener('click', () => this.transpositionManager.down());
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
                
                this.transpositionManager.reset(); 
                
                // ANOTACIÓN: El SheetManager ya sabe cómo renderizar correctamente gracias a las
                // correcciones que hicimos en los archivos del 'core'.
                this.sheetManager.render();

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
        this.originalSong = null;
        this.elements.transpositionControls.style.display = 'none';
        this.elements.addToComposerBtn.disabled = true;
        this.transpositionManager.reset();
        this.sheetManager.render();
    };

    private handleAddToComposer = (): void => {
        if (this.originalSong) {
            const songForComposer = JSON.parse(JSON.stringify(this.originalSong));
            const currentOffset = this.transpositionManager.getOffset();

            if (currentOffset !== 0) {
                songForComposer.allChords.forEach((chord: SequenceItem) => {
                    if (chord.rootNote) {
                        chord.rootNote = transposeNote(chord.rootNote, currentOffset);
                    }
                    if (chord.bassNote) {
                        chord.bassNote = transposeNote(chord.bassNote, currentOffset);
                    }
                });
            }
            this.callbacks.addToComposer(songForComposer);
        }
    }
}
