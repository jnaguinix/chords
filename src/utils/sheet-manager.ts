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
}

/**
 * Gestiona el renderizado y la interactividad de la partitura musical (SongSheet).
 */
export class SheetManager {
    private config: SheetManagerConfig;

    constructor(config: SheetManagerConfig) {
        this.config = config;
    }

    /** Dibuja o actualiza la partitura en el contenedor HTML. */
    public render(song: ProcessedSong | null, transposition: number): void {
        this.config.container.innerHTML = '';
        if (!song || song.lines.length === 0) {
            this.config.container.innerHTML = `<div class="song-line"><div class="lyrics-layer" style="min-height: 2em;">Carga o importa una canción para empezar.</div></div>`;
            return;
        }

        song.allChords.forEach(chord => {
            chord.raw = formatChordName(chord, { style: 'short' }, transposition);
        });

        createSongSheet(this.config.container, song.lines, {
            onShortClick: (item) => this.onShortClick(item, transposition),
            onLongClick: (item) => this.onLongClick(item, transposition),
            transposition: transposition,
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
