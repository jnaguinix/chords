// extractor.ts (Refactorizado para usar los nuevos managers)

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
    
    // Instancias de los nuevos managers
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

        // Inicializa el TranspositionManager
        this.transpositionManager = new TranspositionManager(
            this.elements.transpositionDisplay,
            () => this.sheetManager.render() // Callback para redibujar al transportar
        );

        // Inicializa el SheetManager
        this.sheetManager = new SheetManager({
            container: this.elements.songOutput,
            audioEngine: this.audioEngine,
            showInspector: this.callbacks.showInspector,
            getSong: () => this.originalSong, // El extractor siempre trabaja sobre la canción original
            getTransposition: () => this.transpositionManager.getOffset(),
            updateChord: (updatedItem) => {
                // El extractor actualiza el acorde en la canción original
                if (!this.originalSong || updatedItem.id === undefined) return;
                const index = this.originalSong.allChords.findIndex(c => c.id === updatedItem.id);
                if (index > -1) {
                    this.originalSong.allChords[index] = updatedItem;
                    this.sheetManager.render(); // Vuelve a renderizar para mostrar el cambio
                }
            },
            deleteChord: (itemToDelete) => {
                // El extractor también necesita poder borrar acordes
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
        // Los botones ahora llaman a los métodos del manager
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
                
                // --- CAMBIO CLAVE AQUÍ ---
                // Le decimos explícitamente al SheetManager que se redibuje con la nueva canción.
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
        this.sheetManager.render(); // Renderiza el estado vacío
    };

    private handleAddToComposer = (): void => {
        // Al añadir al compositor, creamos una copia limpia con la transposición actual "quemada" en los datos.
        if (this.originalSong) {
            const songForComposer = JSON.parse(JSON.stringify(this.originalSong));
            const currentOffset = this.transpositionManager.getOffset();

            // Si hay una transposición, la aplicamos a la copia antes de enviarla.
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
