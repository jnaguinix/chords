// composer.ts (Versión Final y Corregida con Piano Display)

import type { ProcessedSong, SequenceItem, SongChord, ShowInspectorFn } from '../types';
import { formatChordName, getChordNotes, calculateOptimalPianoRange } from '../core/chord-utils';
import { createSongSheet, createPiano } from '../core/piano-renderer';
import type { AudioEngine } from '../core/audio';

// La interfaz ahora incluye el nuevo piano display
interface ComposerDOMElements {
    clearSequenceBtn: HTMLButtonElement;
    compositionOutput: HTMLElement;
    insertionIndicator: HTMLElement; 
    composerPianoDisplay: HTMLElement; // <-- Piano persistente
}

export class Composer {
    private elements: ComposerDOMElements;
    private showInspector: ShowInspectorFn;
    private audioEngine: AudioEngine;
    private currentSong: ProcessedSong | null = null;
    private nextChordId = 1;
    private currentInsertingChordId: number | null = null; 

    constructor(
        elements: ComposerDOMElements, 
        showInspector: ShowInspectorFn,
        audioEngine: AudioEngine
    ) {
        this.elements = elements;
        this.showInspector = showInspector;
        this.audioEngine = audioEngine;
    }

    public init(): void {
        this.addEventListeners();
        this.render();
    }

    public setSong(song: ProcessedSong): void {
        this.currentSong = song;
        const maxId = Math.max(0, ...song.allChords.map(c => c.id || 0));
        this.nextChordId = maxId + 1;
        this.render();
    }
    
    private addEventListeners(): void {
        this.elements.clearSequenceBtn.addEventListener('click', this.handleClearSequence);
        this.elements.compositionOutput.addEventListener('mousemove', this.handleMouseMove);
        this.elements.compositionOutput.addEventListener('mouseleave', this.handleMouseLeave);
        this.elements.compositionOutput.addEventListener('click', this.handleInsertionClick);
    }

    private handleClearSequence = (): void => {
        this.currentSong = { lines: [], allChords: [] };
        this.nextChordId = 1;
        this.elements.composerPianoDisplay.innerHTML = ''; // Limpia el piano
        this.render();
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
            this.renderSongSheet();
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
                this.render();
            },
            onInsert: (chordToInsert) => {
                if (this.currentInsertingChordId === null) {
                    this.currentInsertingChordId = this.nextChordId++;
                    chordToInsert.id = this.currentInsertingChordId;
                    this.addChordToSongData(chordToInsert, capturedInsertionTarget);
                }
                this.render(); 
                this.handleMouseLeave(); 
                this.currentInsertingChordId = null; 
            },
            onDelete: () => {
                this.handleMouseLeave();
                this.currentInsertingChordId = null;
            }
        });
    };
    
    private addChordToSongData(item: SequenceItem, target: { lineIndex: number; charIndex: number }) {
        if (!this.currentSong || item.id === undefined || !target) return;
        
        const newItem = { ...item, raw: formatChordName(item, { style: 'short' }) };
        const targetLine = this.currentSong.lines[target.lineIndex];
        if (targetLine) {
            const safePosition = Math.min(target.charIndex, targetLine.lyrics.length);
            const newSongChord: SongChord = { chord: newItem, position: safePosition };
            
            targetLine.chords.push(newSongChord);
            targetLine.chords.sort((a, b) => a.position - b.position);
            this.currentSong.allChords.push(newItem);
        }
    }

    private updateChordInSong(updatedItem: SequenceItem) {
        if (!this.currentSong || updatedItem.id === undefined) return;

        const chordToUpdate = this.currentSong.allChords.find(c => c.id === updatedItem.id);
        if (chordToUpdate) {
            Object.assign(chordToUpdate, updatedItem);
            chordToUpdate.raw = formatChordName(chordToUpdate, { style: 'short' });
            for (const line of this.currentSong.lines) {
                const songChordToUpdate = line.chords.find(sc => sc.chord.id === updatedItem.id);
                if (songChordToUpdate) { songChordToUpdate.chord = chordToUpdate; break; }
            }
        }
    }

    private handleDeleteChord = (itemToDelete: SequenceItem): void => {
        if (!this.currentSong || itemToDelete.id === undefined) return;
        this.currentSong.allChords = this.currentSong.allChords.filter(c => c.id !== itemToDelete.id);
        this.currentSong.lines.forEach(line => {
            line.chords = line.chords.filter(sc => sc.chord.id !== itemToDelete.id);
        });
        this.render();
    }

    private updateDisplayPiano(item: SequenceItem): void {
        const { notesToPress, bassNoteIndex, allNotesForRange } = getChordNotes(item);
        if (allNotesForRange.length > 0) {
            const { startNote, endNote } = calculateOptimalPianoRange(allNotesForRange, 15, 2);
            createPiano(this.elements.composerPianoDisplay, startNote, endNote, notesToPress, true, bassNoteIndex);
        } else {
            this.elements.composerPianoDisplay.innerHTML = '';
        }
    }

    private onShortClick = (item: SequenceItem): void => {
        this.audioEngine.playChord(item);
        this.updateDisplayPiano(item);
    }

    private onLongClick = (item: SequenceItem): void => {
        this.updateDisplayPiano(item);
        this.showInspector(item, {
            onUpdate: (updatedItem) => {
                this.updateChordInSong(updatedItem);
                this.render();
            },
            onDelete: this.handleDeleteChord
        });
    }
    
    private render(): void {
        this.renderSongSheet();
    }

    private renderSongSheet(): void {
        this.elements.compositionOutput.innerHTML = '';
        if (!this.currentSong || this.currentSong.lines.length === 0) {
            this.elements.compositionOutput.className = 'song-sheet-container';
            this.elements.compositionOutput.innerHTML = `<div class="song-line" data-line-index="0"><div class="lyrics-layer" style="min-height: 2em; cursor: text;">Haz clic aquí para empezar a componer...</div></div>`;
            return;
        }
        
        createSongSheet(this.elements.compositionOutput, this.currentSong.lines, {
            onShortClick: this.onShortClick,
            onLongClick: this.onLongClick,
            // 'isEditable' ha sido eliminado para corregir el error de TypeScript
        });
    }
}
