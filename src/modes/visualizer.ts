import { getChordNotes, calculateOptimalPianoRange } from '../core/chord-utils';
import { createPiano } from '../core/piano-renderer';
import type { AudioEngine } from '../core/audio';
import { MUSICAL_INTERVALS, SELECTOR_NOTES } from '../constants';
import type { SequenceItem } from '../types';

interface VisualizerDOMElements {
    pianoContainer: HTMLElement;
    rootNoteSelect: HTMLSelectElement;
    chordTypeSelect: HTMLSelectElement;
    bassNoteSelect: HTMLSelectElement;
    inversionSelect: HTMLSelectElement;
    chordNameDisplay: HTMLElement;
    playChordBtn: HTMLButtonElement;
}

export class Visualizer {
    private elements: VisualizerDOMElements;
    private audioEngine: AudioEngine;
    private currentChord: SequenceItem | null = null;

    constructor(elements: VisualizerDOMElements, audioEngine: AudioEngine) {
        this.elements = elements;
        this.audioEngine = audioEngine;
        this.elements.inversionSelect = document.getElementById('visualizer-inversion-select') as HTMLSelectElement;
    }

    public init(): void {
        this.populateSelectors();
        this.addEventListeners();
        this.handleChordChange();
    }

    private populateSelectors(): void {
        // Populate Root Note and Bass Note selectors
        [this.elements.rootNoteSelect, this.elements.bassNoteSelect].forEach((select, index) => {
            // Add "No Bass" option only to the bass selector
            if (index === 1) {
                const defaultOption = document.createElement('option');
                defaultOption.value = "none";
                defaultOption.textContent = "Sin Bajo";
                select.appendChild(defaultOption);
            }
            SELECTOR_NOTES.forEach(note => {
                const option = document.createElement('option');
                option.value = note;
                option.textContent = note;
                select.appendChild(option);
            });
            // Set default values
            select.value = index === 1 ? 'none' : 'C';
        });

        // Populate Chord Type selector
        Object.keys(MUSICAL_INTERVALS).forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            this.elements.chordTypeSelect.appendChild(option);
        });
        this.elements.chordTypeSelect.value = 'Mayor';

        // Populate Inversion selector
        for (let i = 0; i <= 3; i++) {
            const option = document.createElement('option');
            option.value = i.toString();
            option.textContent = i === 0 ? 'Fundamental' : `${i}ª Inversión`;
            this.elements.inversionSelect.appendChild(option);
        }
        this.elements.inversionSelect.value = '0';
    }

    private addEventListeners(): void {
        this.elements.rootNoteSelect.addEventListener('change', this.handleChordChange);
        this.elements.chordTypeSelect.addEventListener('change', this.handleChordChange);
        this.elements.bassNoteSelect.addEventListener('change', this.handleChordChange);
        this.elements.inversionSelect.addEventListener('change', this.handleChordChange);
        this.elements.playChordBtn.addEventListener('click', this.handlePlayChord);
    }

    private handlePlayChord = (): void => {
        if (this.currentChord) {
            this.audioEngine.playChord(this.currentChord);
        }
    }

    private handleChordChange = (): void => {
        const rootNote = this.elements.rootNoteSelect.value;
        const chordType = this.elements.chordTypeSelect.value;
        const bassNote = this.elements.bassNoteSelect.value;
        const inversion = parseInt(this.elements.inversionSelect.value, 10);

        const chordItem: SequenceItem = {
            rootNote,
            type: chordType,
            inversion,
        };
        
        let displayName = `${rootNote} ${chordType}`;
        if (bassNote !== 'none') {
            chordItem.bassNote = bassNote;
            displayName += ` / ${bassNote}`;
        }
        if (inversion > 0) {
            displayName += ` (${inversion}ª Inv.)`;
        }
        
        this.currentChord = chordItem;
        this.elements.chordNameDisplay.textContent = displayName;

        // --- CORRECCIÓN AQUÍ ---
        // Se eliminó el segundo argumento 'true' de la llamada a getChordNotes.
        const { 
            notesToPress: visualNotesToPress, 
            bassNoteIndex: visualBassNoteIndex, 
            allNotesForRange 
        } = getChordNotes(chordItem);

        if (allNotesForRange.length === 0) {
            this.elements.pianoContainer.innerHTML = '';
            return;
        }

        const { startNote, endNote } = calculateOptimalPianoRange(allNotesForRange);
        
        createPiano(
            this.elements.pianoContainer, 
            startNote, 
            endNote, 
            visualNotesToPress,
            false, 
            visualBassNoteIndex,
            (noteIndex) => {
                this.audioEngine.playNote(noteIndex);
            }
        );
    };
}