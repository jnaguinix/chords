import { Visualizer } from './src/modes/visualizer';
import { Composer } from './src/modes/composer';
import { Extractor } from './src/modes/extractor';
import { AudioEngine } from './src/core/audio';
import { createPiano } from './src/core/piano-renderer';
import { getChordNotes, calculateOptimalPianoRange } from './src/core/chord-utils';
import { MUSICAL_INTERVALS } from './src/constants';
import type { SequenceItem, ProcessedSong } from './src/types';

class PianoApp {
    private tabs: { [key: string]: HTMLElement };
    private modes: { [key: string]: HTMLElement };

    private visualizer: Visualizer;
    private composer: Composer;
    private extractor: Extractor;
    private audioEngine: AudioEngine;

    // --- Chord Inspector Elements ---
    private chordInspectorModal: HTMLElement;
    private chordInspectorOverlay: HTMLElement;
    private chordInspectorTitle: HTMLElement;
    private chordInspectorPiano: HTMLElement;
    private chordInspectorPlayBtn: HTMLButtonElement;
    private chordInspectorCloseBtn: HTMLButtonElement;
    private chordInspectorInversionSelect: HTMLSelectElement;

    constructor() {
        this.tabs = {
            visualizer: document.getElementById('visualizer-tab')!,
            composer: document.getElementById('composer-tab')!,
            extractor: document.getElementById('extractor-tab')!,
        };
        this.modes = {
            visualizer: document.getElementById('visualizer-mode')!,
            composer: document.getElementById('composer-mode')!,
            extractor: document.getElementById('extractor-mode')!,
        };

        this.chordInspectorModal = document.getElementById('chord-inspector-modal')!;
        this.chordInspectorOverlay = document.getElementById('chord-inspector-overlay')!;
        this.chordInspectorTitle = document.getElementById('chord-inspector-title')!;
        this.chordInspectorPiano = document.getElementById('chord-inspector-piano')!;
        this.chordInspectorPlayBtn = document.getElementById('chord-inspector-play-btn') as HTMLButtonElement;
        this.chordInspectorCloseBtn = document.getElementById('chord-inspector-close-btn') as HTMLButtonElement;
        this.chordInspectorInversionSelect = document.getElementById('chord-inspector-inversion-select') as HTMLSelectElement;
        
        this.audioEngine = new AudioEngine();

        this.visualizer = new Visualizer({
                pianoContainer: document.getElementById('piano-container')!,
                rootNoteSelect: document.getElementById('root-note-select') as HTMLSelectElement,
                chordTypeSelect: document.getElementById('chord-type-select') as HTMLSelectElement,
                bassNoteSelect: document.getElementById('visualizer-bass-note-select') as HTMLSelectElement,
                inversionSelect: document.getElementById('visualizer-inversion-select') as HTMLSelectElement,
                chordNameDisplay: document.getElementById('chord-name')!,
                playChordBtn: document.getElementById('visualizer-play-btn') as HTMLButtonElement,
            },
            this.audioEngine
        );
        
        this.composer = new Composer({
                rootNoteSelect: document.getElementById('composer-root-note-select') as HTMLSelectElement,
                typeSelect: document.getElementById('composer-type-select') as HTMLSelectElement,
                bassNoteSelect: document.getElementById('composer-bass-note-select') as HTMLSelectElement,
                inversionSelect: document.getElementById('composer-inversion-select') as HTMLSelectElement,
                addToSequenceBtn: document.getElementById('add-to-sequence-btn') as HTMLButtonElement,
                sequenceDisplay: document.getElementById('sequence-display')!,
                generateCompositionBtn: document.getElementById('generate-composition-btn') as HTMLButtonElement,
                clearSequenceBtn: document.getElementById('clear-sequence-btn') as HTMLButtonElement,
                compositionOutput: document.getElementById('composition-output')!,
            },
            this.showChordInspector
        );

        this.extractor = new Extractor({
                songInput: document.getElementById('song-input') as HTMLTextAreaElement,
                processSongBtn: document.getElementById('process-song-btn') as HTMLButtonElement,
                addToComposerBtn: document.getElementById('add-to-composer-btn') as HTMLButtonElement,
                loader: document.getElementById('extractor-loader')!,
                songOutput: document.getElementById('song-output')!,
                transpositionControls: document.getElementById('transposition-controls')!,
                transposeUpBtn: document.getElementById('transpose-up-btn') as HTMLButtonElement,
                transposeDownBtn: document.getElementById('transpose-down-btn') as HTMLButtonElement,
                transpositionDisplay: document.getElementById('transposition-display')!,
            },
            {
                showInspector: this.showChordInspector,
                addToComposer: this.addSongToComposer,
            }
        );

        this.init();
    }

    private init(): void {
        Object.keys(this.tabs).forEach(key => {
            this.tabs[key].addEventListener('click', () => this.switchMode(key as any));
        });

        this.visualizer.init();
        this.composer.init();
        this.extractor.init();
        
        this.chordInspectorCloseBtn.addEventListener('click', this.hideChordInspector);
        this.chordInspectorOverlay.addEventListener('click', this.hideChordInspector);
        this.chordInspectorInversionSelect.addEventListener('change', this.handleInversionChange);
    }
    
    private currentInspectorItem: SequenceItem | null = null;

    private handleInversionChange = (): void => {
        if (this.currentInspectorItem) {
            const selectedInversion = parseInt(this.chordInspectorInversionSelect.value, 10);
            this.currentInspectorItem.inversion = selectedInversion;
            this.renderChordInspectorPiano(this.currentInspectorItem);
        }
    }

    private renderChordInspectorPiano = (item: SequenceItem): void => {
        // --- CORRECCIÓN AQUÍ ---
        // Se eliminó el segundo argumento 'true' de la llamada a getChordNotes.
        const { notesToPress, bassNoteIndex, allNotesForRange } = getChordNotes(item);
    
        if (allNotesForRange.length > 0) {
            // Use the new utility function, with parameters for a smaller piano
            const { startNote, endNote } = calculateOptimalPianoRange(allNotesForRange, 15, 2);
    
            createPiano(this.chordInspectorPiano, startNote, endNote, notesToPress, true, bassNoteIndex);
        } else {
            this.chordInspectorPiano.innerHTML = '';
        }
    }

    private switchMode = (mode: 'visualizer' | 'composer' | 'extractor'): void => {
        Object.keys(this.modes).forEach(key => {
            this.modes[key].classList.toggle('active', key === mode);
            this.tabs[key].classList.toggle('active', key === mode);
        });
    }

    private addSongToComposer = (song: ProcessedSong): void => {
        if (!song || song.allChords.length === 0) return;
        this.composer.setSong(song);
        alert(`Canción añadida al compositor.`);
        this.switchMode('composer');
    }

    private showChordInspector = (item: SequenceItem): void => {
        if (!item) return;
    
        this.currentInspectorItem = { ...item }; // Create a copy to avoid modifying the original item directly
    
        const chordTypeName = item.type;
        const fullChordName = `${item.rootNote} ${chordTypeName}`;
        const displayName = item.bassNote ? `${fullChordName} / ${item.bassNote}` : fullChordName;
    
        this.chordInspectorTitle.textContent = displayName;
        
        // Populate inversion select
        this.chordInspectorInversionSelect.innerHTML = ''; // Clear previous options
        const intervals = MUSICAL_INTERVALS[item.type];
        const maxInversions = intervals ? intervals.length : 0; // Number of notes in the chord
        for (let i = 0; i < maxInversions; i++) {
            const option = document.createElement('option');
            option.value = i.toString();
            option.textContent = i === 0 ? 'Fundamental' : `${i}ª Inversión`;
            this.chordInspectorInversionSelect.appendChild(option);
        }
        this.chordInspectorInversionSelect.value = (item.inversion || 0).toString();

        this.chordInspectorPlayBtn.onclick = () => this.audioEngine.playChord(this.currentInspectorItem!);
    
        this.renderChordInspectorPiano(this.currentInspectorItem!);
    
        this.chordInspectorModal.classList.add('visible');
        this.chordInspectorOverlay.classList.add('visible');
    }
    
    private hideChordInspector = (): void => {
        this.chordInspectorModal.classList.remove('visible');
        this.chordInspectorOverlay.classList.remove('visible');
        this.currentInspectorItem = null; // Clear the current item when closing
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new PianoApp();
});