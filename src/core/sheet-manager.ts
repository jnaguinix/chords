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
    showInspector: ShowInspectorFn; // <-- CORRECCIÓN: 'ShowinspectorFn' a 'ShowInspectorFn'
    getSong: () => ProcessedSong | null;
    getTransposition: () => number;
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
    public render(): void {
        const song = this.config.getSong();
        const transposition = this.config.getTransposition();
        
        this.config.container.innerHTML = '';
        if (!song || song.lines.length === 0) {
            this.config.container.innerHTML = `<div class="song-line"><div class="lyrics-layer" style="min-height: 2em;">Carga o importa una canción para empezar.</div></div>`;
            return;
        }

        song.allChords.forEach(chord => {
            chord.raw = formatChordName(chord, { style: 'short' }, transposition);
        });

        createSongSheet(this.config.container, song.lines, {
            onShortClick: this.onShortClick,
            onLongClick: this.onLongClick,
            transposition: transposition,
        });
    }

    /** Maneja el clic corto en un acorde (reproducir sonido). */
    private onShortClick = (item: SequenceItem): void => {
        this.config.audioEngine.playChord(item, this.config.getTransposition());
        this.config.onChordClick?.(item);
    }

    /** Maneja el clic largo en un acorde (abrir el editor/inspector). */
    private onLongClick = (item: SequenceItem): void => {
        const transposition = this.config.getTransposition();
        
        this.config.onChordClick?.(item);

        const itemForInspector = JSON.parse(JSON.stringify(item));
        if (transposition !== 0 && itemForInspector.rootNote) {
            itemForInspector.rootNote = transposeNote(item.rootNote, transposition);
            if (item.bassNote) {
                itemForInspector.bassNote = transposeNote(item.bassNote, transposition);
            }
        }
        
        this.config.showInspector(itemForInspector, {
            // <-- CORRECCIÓN: Se añade el tipo 'SequenceItem' al parámetro
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
