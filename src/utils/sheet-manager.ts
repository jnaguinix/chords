// src/core/sheet-manager.ts

import type { ProcessedSong, SequenceItem, ShowInspectorFn } from '../types';
import { createSongSheet } from './piano-renderer';
import type { AudioEngine } from './audio';
import { transposeNote, formatChordName } from './chord-utils';

/**
 * Configuración necesaria para inicializar el SheetManager.
 */
interface SheetManagerConfig {
    container: HTMLElement;
    audioEngine: AudioEngine;
    showInspector: ShowInspectorFn;
    updateChord: (updatedItem: SequenceItem) => void;
    deleteChord: (itemToDelete: SequenceItem) => void;
    onChordClick?: (item: SequenceItem) => void;
    getTransposition: () => number;
    getSong: () => ProcessedSong | null;
}

/**
 * Gestiona el renderizado y la interactividad de la partitura musical (SongSheet).
 */
export class SheetManager {
    private config: SheetManagerConfig;

    constructor(config: SheetManagerConfig) {
        this.config = config;
    }

    public updateCallbacks(newUpdateChord: (updatedItem: SequenceItem) => void, newDeleteChord: (itemToDelete: SequenceItem) => void) {
        this.config.updateChord = newUpdateChord;
        this.config.deleteChord = newDeleteChord;
    }

    /** Dibuja o actualiza la partitura en el contenedor HTML. */
    public render(song?: ProcessedSong | null, transposition?: number): void {
        const songToRender = song !== undefined ? song : this.config.getSong();
        const transpositionToApply = transposition !== undefined ? transposition : this.config.getTransposition();
        this.config.container.innerHTML = '';
        if (!songToRender || songToRender.lines.length === 0) {
            this.config.container.innerHTML = `<div class="song-line"><div class="lyrics-layer" style="min-height: 2em;">Carga o importa una canción para empezar.</div></div>`;
            return;
        }

        songToRender.allChords.forEach(chord => {
            chord.raw = formatChordName(chord, { style: 'short' }, transpositionToApply);
        });

        createSongSheet(this.config.container, songToRender.lines, {
            onShortClick: (item) => this.onShortClick(item, transpositionToApply),
            onLongClick: (item) => this.onLongClick(item, transpositionToApply),
            transposition: transpositionToApply,
        });
    }

    /** Maneja el clic corto en un acorde (reproducir sonido). */
    private onShortClick = (item: SequenceItem, transposition: number): void => {
        this.config.audioEngine.playChord(item, transposition);
        this.config.onChordClick?.(item);
    }

    /** Maneja el clic largo en un acorde (abrir el editor/inspector). */
    private onLongClick = (item: SequenceItem, transposition: number): void => {
        this.config.onChordClick?.(item);

        const itemForInspector = JSON.parse(JSON.stringify(item));
        if (transposition !== 0 && itemForInspector.rootNote) {
            itemForInspector.rootNote = transposeNote(item.rootNote, transposition);
            if (item.bassNote) {
                itemForInspector.bassNote = transposeNote(item.bassNote, transposition);
            }
        }
        
        this.config.showInspector(itemForInspector, {
            onUpdate: (updatedItemFromInspector: SequenceItem) => {
                const finalChordToSave = JSON.parse(JSON.stringify(updatedItemFromInspector));
                finalChordToSave.id = item.id;
                
                finalChordToSave.rootNote = transposeNote(updatedItemFromInspector.rootNote, -transposition);
                if (updatedItemFromInspector.bassNote) {
                    finalChordToSave.bassNote = transposeNote(updatedItemFromInspector.bassNote, -transposition);
                }
                
                this.config.updateChord(finalChordToSave);
            },
            onDelete: () => this.config.deleteChord(item)
        });
    }
}
