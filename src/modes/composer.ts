// composer.ts (Refactorizado para usar los nuevos managers y restaurar el display del piano)

import type { ProcessedSong, SequenceItem, SongChord, ShowInspectorFn } from '../types';
// --- CAMBIO: Se reincorporan las importaciones necesarias para el piano ---
import { formatChordName, getChordNotes, calculateOptimalPianoRange } from '../core/chord-utils';
import { createPiano } from '../core/piano-renderer';
import type { AudioEngine } from '../core/audio';
import { TranspositionManager } from '../core/transposition-manager';
import { SheetManager } from '../core/sheet-manager';

interface ComposerDOMElements {
    compositionOutput: HTMLElement;
    insertionIndicator: HTMLElement; 
    composerPianoDisplay: HTMLElement;
    composerChordNameDisplay: HTMLElement;
    transpositionControls: HTMLElement;
    transposeUpBtn: HTMLButtonElement;
    transposeDownBtn: HTMLButtonElement;
    transpositionDisplay: HTMLElement;
    exportBtn: HTMLButtonElement;
    importBtn: HTMLButtonElement;
}

export class Composer {
    private elements: ComposerDOMElements;
    private showInspector: ShowInspectorFn;
    private audioEngine: AudioEngine;
    
    private currentSong: ProcessedSong | null = null;
    private nextChordId = 1;
    private currentInsertingChordId: number | null = null; 

    private transpositionManager: TranspositionManager;
    private sheetManager: SheetManager;

    constructor(
        elements: ComposerDOMElements, 
        showInspector: ShowInspectorFn,
        audioEngine: AudioEngine
    ) {
        this.elements = elements;
        this.showInspector = showInspector;
        this.audioEngine = audioEngine;
        
        this.transpositionManager = new TranspositionManager(
            this.elements.transpositionDisplay,
            () => this.sheetManager.render()
        );

        this.sheetManager = new SheetManager({
            container: this.elements.compositionOutput,
            audioEngine: this.audioEngine,
            showInspector: this.showInspector,
            getSong: () => this.currentSong,
            getTransposition: () => this.transpositionManager.getOffset(),
            updateChord: this.updateChordInSong,
            deleteChord: this.handleDeleteChord,
            // --- CAMBIO CLAVE AQUÍ ---
            // Le decimos al SheetManager qué hacer cuando se hace clic en un acorde.
            onChordClick: this.updateDisplayPiano,
        });
    }

    public init(): void {
        this.addEventListeners();
        this.sheetManager.render();
    }

    public setSong(song: ProcessedSong): void {
        this.currentSong = song;
        const maxId = Math.max(0, ...song.allChords.map(c => c.id || 0));
        this.nextChordId = maxId + 1;
        this.transpositionManager.reset(); 
        this.sheetManager.render();
    }
    
    private addEventListeners(): void {
        this.elements.compositionOutput.addEventListener('mousemove', this.handleMouseMove);
        this.elements.compositionOutput.addEventListener('mouseleave', this.handleMouseLeave);
        this.elements.compositionOutput.addEventListener('click', this.handleInsertionClick);
        this.elements.transposeUpBtn.addEventListener('click', () => this.transpositionManager.up());
        this.elements.transposeDownBtn.addEventListener('click', () => this.transpositionManager.down());
        this.elements.exportBtn.addEventListener('click', this.handleExportSong);
        this.elements.importBtn.addEventListener('click', this.handleImportSong);
    }

    // --- FUNCIÓN RESTAURADA ---
    // Esta función se encarga de actualizar el piano y el nombre del acorde en la parte superior.
    private updateDisplayPiano = (item: SequenceItem): void => {
        const currentTransposition = this.transpositionManager.getOffset();
        const { notesToPress, bassNoteIndex, allNotesForRange } = getChordNotes(item, currentTransposition);
        
        this.elements.composerChordNameDisplay.textContent = formatChordName(item, { style: 'long' }, currentTransposition);

        if (allNotesForRange.length > 0) {
            const { startNote, endNote } = calculateOptimalPianoRange(allNotesForRange, 15, 2);
            createPiano(this.elements.composerPianoDisplay, startNote, endNote, notesToPress, true, bassNoteIndex);
        } else {
            this.elements.composerPianoDisplay.innerHTML = '';
        }
    }

    // ... (el resto del archivo permanece igual)

    private handleExportSong = (): void => {
        if (!this.currentSong) {
            alert('No hay canción para exportar.');
            return;
        }
        const songJson = JSON.stringify(this.currentSong, null, 2);
        const blob = new Blob([songJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'my_song.chordsong';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    private handleImportSong = (): void => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.chordsong,.json';
        input.onchange = async (event) => {
            const file = (event.target as HTMLInputElement).files?.[0];
            if (file) {
                try {
                    const content = await file.text();
                    const importedSong = JSON.parse(content);
                    this.setSong(importedSong);
                    alert('Canción importada exitosamente.');
                } catch (error: any) {
                    console.error("Error al importar el archivo de canción:", error);
                    alert("Error al importar la canción: " + error.message);
                }
            }
        };
        input.click();
    };

    private getCharWidth(element: HTMLElement): number {
        const span = document.createElement('span');
        span.textContent = '0';
        span.style.visibility = 'hidden';
        span.style.position = 'absolute';
        element.appendChild(span);
        const width = span.getBoundingClientRect().width;
        element.removeChild(span);
        return width || 10;
    }

    private handleMouseMove = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const songLineEl = target.closest<HTMLElement>('.song-line');
        if (!songLineEl) { this.handleMouseLeave(); return; }
        const lyricsEl = songLineEl.querySelector('.lyrics-layer');
        const chordActionEl = target.closest('.chord-action, .chord-annotation');
        if (lyricsEl && !chordActionEl) {
            const indicator = this.elements.insertionIndicator;
            indicator.style.opacity = '1';
            indicator.style.left = `${e.pageX}px`;
            indicator.style.top = `${e.pageY}px`;
        } else { this.handleMouseLeave(); }
    };

    private handleMouseLeave = () => {
        this.elements.insertionIndicator.style.opacity = '0';
    };

    private handleInsertionClick = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const lyricsEl = target.closest<HTMLElement>('.lyrics-layer');
        const chordActionEl = target.closest('.chord-action, .chord-annotation');
        if (!lyricsEl || chordActionEl) return;

        if (!this.currentSong) {
            this.currentSong = { lines: [{ lyrics: '', chords: [], isInstrumental: false }], allChords: [] };
            this.nextChordId = 1;
            this.sheetManager.render();
        }
        
        const songLineEl = lyricsEl.closest<HTMLElement>('.song-line')!;
        const lineIndex = parseInt(songLineEl.dataset.lineIndex || '0', 10);

        const rect = lyricsEl.getBoundingClientRect();
        const charWidth = this.getCharWidth(lyricsEl);
        const relativeX = e.clientX - rect.left;
        let charIndex = Math.round(relativeX / charWidth);
        const text = lyricsEl.textContent || '';
        charIndex = Math.max(0, Math.min(charIndex, text.length));
        
        const capturedInsertionTarget = { lineIndex, charIndex };
        this.currentInsertingChordId = null; 
        
        const newChordTemplate: SequenceItem = { rootNote: 'C', type: 'Mayor', inversion: 0 };

        this.showInspector(newChordTemplate, {
            onUpdate: (chordBeingBuilt) => {
                if (this.currentInsertingChordId === null) {
                    this.currentInsertingChordId = this.nextChordId++;
                    chordBeingBuilt.id = this.currentInsertingChordId;
                    this.addChordToSongData(chordBeingBuilt, capturedInsertionTarget);
                } else {
                    this.updateChordInSong(chordBeingBuilt); 
                }
                this.sheetManager.render();
            },
            onInsert: (chordToInsert) => {
                if (this.currentInsertingChordId === null) {
                    this.currentInsertingChordId = this.nextChordId++;
                    chordToInsert.id = this.currentInsertingChordId;
                    this.addChordToSongData(chordToInsert, capturedInsertionTarget);
                }
                this.sheetManager.render(); 
                this.handleMouseLeave(); 
                this.currentInsertingChordId = null; 
            },
            onDelete: () => {
                this.handleMouseLeave();
                this.currentInsertingChordId = null;
            }
        });
    };
    
    private addChordToSongData = (item: SequenceItem, target: { lineIndex: number; charIndex: number }) => {
        if (!this.currentSong || item.id === undefined || !target) return;
        
        const newItem = { ...item, raw: formatChordName(item, { style: 'short' }, this.transpositionManager.getOffset()) };
        const targetLine = this.currentSong.lines[target.lineIndex];
        if (targetLine) {
            const safePosition = Math.min(target.charIndex, targetLine.lyrics.length);
            const newSongChord: SongChord = { chord: newItem, position: safePosition };
            
            targetLine.chords.push(newSongChord);
            targetLine.chords.sort((a, b) => a.position - b.position);
            this.currentSong.allChords.push(newItem);
        }
    }

    private updateChordInSong = (updatedItem: SequenceItem) => {
        if (!this.currentSong || updatedItem.id === undefined) return;

        let found = false;
        // Primero, actualiza el acorde en la estructura anidada `lines`, que es la fuente de la verdad para el renderizado.
        for (const line of this.currentSong.lines) {
            for (const songChord of line.chords) {
                if (songChord.chord.id === updatedItem.id) {
                    songChord.chord = updatedItem;
                    found = true;
                    break;
                }
            }
            if (found) break;
        }

        // Luego, actualiza también la lista plana `allChords` para mantener la consistencia.
        const chordIndex = this.currentSong.allChords.findIndex(c => c.id === updatedItem.id);
        if (chordIndex !== -1) {
            this.currentSong.allChords[chordIndex] = updatedItem;
        }

        // Finalmente, vuelve a renderizar la partitura para mostrar los cambios.
        this.sheetManager.render();
    }

    private handleDeleteChord = (itemToDelete: SequenceItem): void => {
        if (!this.currentSong || itemToDelete.id === undefined) return;
        this.currentSong.allChords = this.currentSong.allChords.filter(c => c.id !== itemToDelete.id);
        this.currentSong.lines.forEach(line => {
            line.chords = line.chords.filter(sc => sc.chord.id !== itemToDelete.id);
        });
        this.sheetManager.render();
    }
}
