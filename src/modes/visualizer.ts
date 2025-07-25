/*
================================================================================
|                               visualizer.ts                                  |
|            (Versión final con selectores de acordes dinámicos)               |
================================================================================
*/

import { getChordNotes, calculateOptimalPianoRange, formatChordName } from '../core/chord-utils';
// ANOTACIÓN: Se importa la nueva función centralizada.
import { createPiano, populateNoteSelector, populateChordTypeSelector } from '../core/piano-renderer';
import type { AudioEngine } from '../core/audio';
import { MUSICAL_INTERVALS, INDEX_TO_SHARP_NAME, INDEX_TO_FLAT_NAME, NOTE_TO_INDEX } from '../constants';
import type { SequenceItem } from '../types';

const EDITABLE_ALTERATIONS = ['b5', '#5', 'b9', '#9', '#11', 'b13'];

interface VisualizerDOMElements {
    pianoContainer: HTMLElement;
    rootNoteSelect: HTMLSelectElement;
    chordTypeSelect: HTMLSelectElement;
    bassNoteSelect: HTMLSelectElement;
    inversionSelect: HTMLSelectElement;
    chordNameDisplay: HTMLElement;
    playChordBtn: HTMLButtonElement;
    modificationsEditor: HTMLElement;
}

export class Visualizer {
    private elements: VisualizerDOMElements;
    private audioEngine: AudioEngine;
    private currentChord: SequenceItem;

    constructor(elements: VisualizerDOMElements, audioEngine: AudioEngine) {
        this.elements = elements;
        this.audioEngine = audioEngine;
        this.currentChord = { rootNote: 'C', type: 'Mayor', inversion: 0, alterations: [] };
    }

    public init(): void {
        this.populateSelectors();
        this.addEventListeners();
        this.updateInversionSelect();
        this.handleChordChange();
    }
    
    /**
     * Rellena los selectores de notas y el de acordes por primera vez.
     */
    private populateSelectors(): void {
        const allNotes = [...new Set([...INDEX_TO_SHARP_NAME, ...INDEX_TO_FLAT_NAME])].sort((a,b) => NOTE_TO_INDEX[a] - NOTE_TO_INDEX[b] || a.localeCompare(b));
        
        populateNoteSelector(this.elements.rootNoteSelect, allNotes);
        this.elements.rootNoteSelect.value = 'C';
        
        populateNoteSelector(this.elements.bassNoteSelect, allNotes, true);
        this.elements.bassNoteSelect.value = 'none';

        // ANOTACIÓN: Se llama a la función centralizada con la nota raíz inicial.
        populateChordTypeSelector(this.elements.chordTypeSelect, 'C', 'Mayor');
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

    /**
     * Actualiza el selector de inversiones basado en el número de notas del acorde.
     */
    private updateInversionSelect(): void {
        const selectedType = this.elements.chordTypeSelect.value;
        const intervals = MUSICAL_INTERVALS[selectedType];
        const numNotes = intervals ? intervals.length : 0;
        let currentInversion = parseInt(this.elements.inversionSelect.value, 10) || 0;
        
        this.elements.inversionSelect.innerHTML = ''; 
        
        if (numNotes > 0) {
            for (let i = 0; i < numNotes; i++) {
                const option = document.createElement('option');
                option.value = i.toString();
                option.textContent = i === 0 ? 'Fundamental' : `${i}ª Inversión`;
                this.elements.inversionSelect.appendChild(option);
            }
            // Si la inversión actual es inválida para el nuevo acorde, resetea a fundamental.
            if (currentInversion >= numNotes) {
                this.elements.inversionSelect.value = '0';
            } else {
                this.elements.inversionSelect.value = currentInversion.toString();
            }
        }
    }

    /**
     * Manejador principal que se activa cada vez que cambia un selector.
     * Recalcula el estado, actualiza la UI y redibuja el piano.
     */
    private handleChordChange = (): void => {
        const previousType = this.currentChord.type;
        const previousRoot = this.currentChord.rootNote;
        
        const newRoot = this.elements.rootNoteSelect.value;
        const newType = this.elements.chordTypeSelect.value;

        // ANOTACIÓN: ¡Aquí está la magia!
        // Si la nota raíz cambió, volvemos a poblar la lista de acordes.
        if (newRoot !== previousRoot) {
            populateChordTypeSelector(this.elements.chordTypeSelect, newRoot, newType);
        }
        
        // Si el tipo de acorde cambió, actualizamos las inversiones disponibles.
        if (newType !== previousType) {
             this.updateInversionSelect();
        }
        
        // Actualiza el estado interno del acorde.
        this.currentChord.rootNote = newRoot;
        this.currentChord.type = newType;
        this.currentChord.bassNote = this.elements.bassNoteSelect.value === 'none' ? undefined : this.elements.bassNoteSelect.value;
        this.currentChord.inversion = parseInt(this.elements.inversionSelect.value, 10);
        
        // Si el tipo de acorde cambió, reseteamos las alteraciones.
        if (newType !== previousType) {
            this.currentChord.alterations = [];
        }

        // Actualiza la UI.
        this.elements.chordNameDisplay.textContent = formatChordName(this.currentChord, { style: 'long' });
        this.populateModificationsEditor();

        // Obtiene las notas y redibuja el piano.
        const { 
            notesToPress, 
            bassNoteIndex, 
            allNotesForRange 
        } = getChordNotes(this.currentChord);

        if (allNotesForRange.length === 0) {
            this.elements.pianoContainer.innerHTML = '';
            return;
        }

        const { startNote, endNote } = calculateOptimalPianoRange(allNotesForRange);
        
        createPiano(
            this.elements.pianoContainer, 
            startNote, 
            endNote, 
            notesToPress,
            false, 
            bassNoteIndex,
            (noteIndex) => this.audioEngine.playNote(noteIndex)
        );
    };

    /**
     * Rellena el editor de alteraciones y maneja sus eventos.
     */
    private populateModificationsEditor(): void {
        this.elements.modificationsEditor.innerHTML = '';
        EDITABLE_ALTERATIONS.forEach(alt => {
            const button = document.createElement('button');
            button.className = 'mod-button';
            button.textContent = alt;
            button.dataset.alt = alt;
            if (this.currentChord.alterations?.includes(alt)) {
                button.classList.add('selected');
            }
            button.addEventListener('click', () => {
                if (!this.currentChord.alterations) this.currentChord.alterations = [];
                const altIndex = this.currentChord.alterations.indexOf(alt);
                if (altIndex > -1) {
                    this.currentChord.alterations.splice(altIndex, 1);
                } else {
                    this.currentChord.alterations.push(alt);
                }
                this.handleChordChange();
            });
            this.elements.modificationsEditor.appendChild(button);
        });
    }
}
