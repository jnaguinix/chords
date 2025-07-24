import './index.css';
import { Visualizer } from './modes/visualizer';
import { Composer } from './modes/composer';
import { Extractor } from './modes/extractor';
import { AudioEngine } from './core/audio';
import { createPiano, populateNoteSelector } from './core/piano-renderer';
import { getChordNotes, calculateOptimalPianoRange } from './core/chord-utils';
import { MUSICAL_INTERVALS, NOTE_TO_INDEX, INDEX_TO_SHARP_NAME, INDEX_TO_FLAT_NAME } from './constants';
import type { SequenceItem, ProcessedSong, InspectorCallbacks, ShowInspectorFn } from './types';

const EDITABLE_ALTERATIONS = ['b5', '#5', 'b9', '#9', '#11', 'b13'];

class PianoApp {
    private tabs: { [key: string]: HTMLElement };
    private modes: { [key: string]: HTMLElement };

    private visualizer: Visualizer;
    private composer: Composer;
    private extractor: Extractor;
    private audioEngine: AudioEngine;

    private chordInspectorModal: HTMLElement;
    private chordInspectorOverlay: HTMLElement;
    private chordInspectorTitle: HTMLElement;
    private chordInspectorPiano: HTMLElement;
    private chordInspectorPlayBtn: HTMLButtonElement;
    private chordInspectorCloseBtn: HTMLButtonElement;
    private chordInspectorDeleteBtn: HTMLButtonElement;
    private chordInspectorInsertBtn: HTMLButtonElement;
    // --- NUEVO BOTÓN ---
    private chordInspectorSaveBtn: HTMLButtonElement; 
    private chordInspectorRootNoteSelect: HTMLSelectElement;
    private chordInspectorTypeSelect: HTMLSelectElement;
    private chordInspectorBassNoteSelect: HTMLSelectElement;
    private chordInspectorInversionSelect: HTMLSelectElement;
    private chordInspectorModificationsEditor: HTMLElement;

    private currentInspectorItem: SequenceItem | null = null;
    private currentInspectorCallbacks: InspectorCallbacks | null = null;

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
        this.chordInspectorDeleteBtn = document.getElementById('chord-inspector-delete-btn') as HTMLButtonElement;
        this.chordInspectorInsertBtn = document.getElementById('chord-inspector-insert-btn') as HTMLButtonElement; 
        this.chordInspectorSaveBtn = document.getElementById('chord-inspector-save-btn') as HTMLButtonElement; // Get new button
        this.chordInspectorRootNoteSelect = document.getElementById('chord-inspector-root-note-select') as HTMLSelectElement;
        this.chordInspectorTypeSelect = document.getElementById('chord-inspector-type-select') as HTMLSelectElement;
        this.chordInspectorBassNoteSelect = document.getElementById('chord-inspector-bass-note-select') as HTMLSelectElement;
        this.chordInspectorInversionSelect = document.getElementById('chord-inspector-inversion-select') as HTMLSelectElement;
        this.chordInspectorModificationsEditor = document.getElementById('chord-inspector-modifications-editor')!;
        this.audioEngine = new AudioEngine();
        this.visualizer = new Visualizer({
                pianoContainer: document.getElementById('piano-container')!,
                rootNoteSelect: document.getElementById('root-note-select') as HTMLSelectElement,
                chordTypeSelect: document.getElementById('chord-type-select') as HTMLSelectElement,
                bassNoteSelect: document.getElementById('visualizer-bass-note-select') as HTMLSelectElement,
                inversionSelect: document.getElementById('visualizer-inversion-select') as HTMLSelectElement,
                chordNameDisplay: document.getElementById('chord-name')!,
                playChordBtn: document.getElementById('visualizer-play-btn') as HTMLButtonElement,
                modificationsEditor: document.getElementById('visualizer-modifications-editor')!
            },
            this.audioEngine
        );
        this.composer = new Composer({
                compositionOutput: document.getElementById('composition-output')!,
                insertionIndicator: document.getElementById('chord-insertion-indicator')!,
                composerPianoDisplay: document.getElementById('composer-piano-display')!,
                composerChordNameDisplay: document.getElementById('composer-chord-name-display')!, 
                transpositionControls: document.getElementById('composer-transposition-controls')!,
                transposeUpBtn: document.getElementById('composer-transpose-up-btn') as HTMLButtonElement,
                transposeDownBtn: document.getElementById('composer-transpose-down-btn') as HTMLButtonElement,
                transpositionDisplay: document.getElementById('composer-transposition-display')!,
                exportBtn: document.getElementById('export-song-btn') as HTMLButtonElement,
                importBtn: document.getElementById('import-song-btn') as HTMLButtonElement,
            },
            this.showInspector,
            this.audioEngine
        );
        this.extractor = new Extractor({
                songInput: document.getElementById('song-input') as HTMLTextAreaElement,
                processSongBtn: document.getElementById('process-song-btn') as HTMLButtonElement,
                clearExtractorBtn: document.getElementById('clear-extractor-btn') as HTMLButtonElement,
                addToComposerBtn: document.getElementById('add-to-composer-btn') as HTMLButtonElement,
                loader: document.getElementById('extractor-loader')!,
                songOutput: document.getElementById('song-output')!,
                transpositionControls: document.getElementById('transposition-controls')!,
                transposeUpBtn: document.getElementById('transpose-up-btn') as HTMLButtonElement,
                transposeDownBtn: document.getElementById('transpose-down-btn') as HTMLButtonElement,
                transpositionDisplay: document.getElementById('transposition-display')!,
            },
            {
                showInspector: this.showInspector,
                addToComposer: this.addSongToComposer,
            },
            this.audioEngine
        );
        this.init();
    }

    private init(): void {
        Object.keys(this.tabs).forEach(key => {
            this.tabs[key].addEventListener('click', () => this.switchMode(key as 'visualizer' | 'composer' | 'extractor'));
        });
        this.visualizer.init();
        this.composer.init();
        this.extractor.init();
        this.chordInspectorCloseBtn.addEventListener('click', this.hideChordInspector);
        this.chordInspectorOverlay.addEventListener('click', this.hideChordInspector);
        this.chordInspectorRootNoteSelect.addEventListener('change', this.handleInspectorChange);
        this.chordInspectorTypeSelect.addEventListener('change', this.handleInspectorChange);
        this.chordInspectorBassNoteSelect.addEventListener('change', this.handleInspectorChange);
        this.chordInspectorInversionSelect.addEventListener('change', this.handleInspectorChange);
        this.chordInspectorInsertBtn.addEventListener('click', this.handleInspectorInsert);
        this.chordInspectorDeleteBtn.addEventListener('click', this.handleInspectorDelete);
        // --- NUEVO EVENT LISTENER ---
        this.chordInspectorSaveBtn.addEventListener('click', this.handleInspectorSave);
    }
    
    // --- NUEVA FUNCIÓN DE GUARDADO ---
    private handleInspectorSave = (): void => {
        if (this.currentInspectorItem && this.currentInspectorCallbacks?.onUpdate) {
            this.currentInspectorCallbacks.onUpdate(this.currentInspectorItem);
        }
        this.hideChordInspector();
    };

    private handleInspectorInsert = (): void => {
        if (this.currentInspectorItem && this.currentInspectorCallbacks?.onInsert) {
            this.currentInspectorCallbacks.onInsert(this.currentInspectorItem);
            this.hideChordInspector();
        }
    };

    private handleInspectorDelete = (): void => {
        if (this.currentInspectorItem && this.currentInspectorCallbacks?.onDelete) {
            this.currentInspectorCallbacks.onDelete(this.currentInspectorItem);
            this.hideChordInspector();
        }
    };
    
    // --- FUNCIÓN MODIFICADA: ya no guarda automáticamente ---
    private handleInspectorChange = (): void => {
        if (!this.currentInspectorItem) return;
        const newRootNote = this.chordInspectorRootNoteSelect.value;
        const newType = this.chordInspectorTypeSelect.value;
        const newBassNote = this.chordInspectorBassNoteSelect.value;
        const newInversion = parseInt(this.chordInspectorInversionSelect.value, 10);
        const typeChanged = this.currentInspectorItem.type !== newType;
        this.currentInspectorItem.rootNote = newRootNote;
        this.currentInspectorItem.type = newType;
        this.currentInspectorItem.bassNote = (newBassNote === 'none') ? undefined : newBassNote;
        this.currentInspectorItem.inversion = newInversion;
        if (typeChanged) {
            this.currentInspectorItem.inversion = 0;
            this.populateInversionSelect(this.currentInspectorItem);
        }
        if (newInversion >= this.chordInspectorInversionSelect.options.length) {
            this.currentInspectorItem.inversion = 0;
            this.chordInspectorInversionSelect.value = '0';
        }
        this.renderChordInspectorPiano(this.currentInspectorItem);
        // Se elimina la llamada a onUpdate para que no se guarde automáticamente
    }
    
    // --- FUNCIÓN MODIFICADA: el click en alteración ya no guarda automáticamente ---
    private populateModificationsEditor(item: SequenceItem): void {
        this.chordInspectorModificationsEditor.innerHTML = '';
        EDITABLE_ALTERATIONS.forEach(alt => {
            const button = document.createElement('button');
            button.className = 'mod-button';
            button.textContent = alt;
            button.dataset.alt = alt;
            if (item.alterations?.includes(alt)) {
                button.classList.add('selected');
            }
            button.addEventListener('click', () => {
                if (!this.currentInspectorItem) return;
                if (!this.currentInspectorItem.alterations) {
                    this.currentInspectorItem.alterations = [];
                }
                const altIndex = this.currentInspectorItem.alterations.indexOf(alt);
                if (altIndex > -1) {
                    this.currentInspectorItem.alterations.splice(altIndex, 1);
                } else {
                    this.currentInspectorItem.alterations.push(alt);
                }
                this.populateModificationsEditor(this.currentInspectorItem);
                this.renderChordInspectorPiano(this.currentInspectorItem);
                // Se elimina la llamada a onUpdate
            });
            this.chordInspectorModificationsEditor.appendChild(button);
        });
    }

    private renderChordInspectorPiano = (item: SequenceItem): void => {
        const { notesToPress, bassNoteIndex, allNotesForRange } = getChordNotes(item);
        if (allNotesForRange.length > 0) {
            const { startNote, endNote } = calculateOptimalPianoRange(allNotesForRange, 15, 2);
            createPiano(this.chordInspectorPiano, startNote, endNote, notesToPress, true, bassNoteIndex);
        } else {
            this.chordInspectorPiano.innerHTML = '';
        }
    }

    private switchMode = (mode: 'visualizer' | 'composer' | 'extractor'): void => {
        Object.keys(this.modes).forEach(key => {
            this.modes[key].classList.toggle('active', key === mode);
        });
        Object.keys(this.tabs).forEach(key => {
            this.tabs[key].classList.toggle('active', key === mode);
        });
    }

    private addSongToComposer = (song: ProcessedSong): void => {
        if (!song || song.allChords.length === 0) return;
        this.composer.setSong(song);
        this.switchMode('composer');
    }
    
    private populateSelects(item: SequenceItem): void {
        const allNotes = [...new Set([...INDEX_TO_SHARP_NAME, ...INDEX_TO_FLAT_NAME])].sort((a, b) => NOTE_TO_INDEX[a] - NOTE_TO_INDEX[b] || a.localeCompare(b));
        populateNoteSelector(this.chordInspectorRootNoteSelect, allNotes);
        this.chordInspectorRootNoteSelect.value = item.rootNote;
        populateNoteSelector(this.chordInspectorBassNoteSelect, allNotes, true);
        this.chordInspectorBassNoteSelect.value = item.bassNote || 'none';
        this.chordInspectorTypeSelect.innerHTML = '';
        Object.keys(MUSICAL_INTERVALS).forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            this.chordInspectorTypeSelect.appendChild(option);
        });
        this.chordInspectorTypeSelect.value = item.type;
        this.populateInversionSelect(item);
    }
    
    private populateInversionSelect(item: SequenceItem): void {
        const currentInversion = item.inversion || 0;
        this.chordInspectorInversionSelect.innerHTML = '';
        const intervals = MUSICAL_INTERVALS[item.type];
        const numNotes = intervals ? intervals.length : 0;
        if (numNotes > 0) {
            for (let i = 0; i < numNotes; i++) {
                const option = document.createElement('option');
                option.value = i.toString();
                option.textContent = i === 0 ? 'Fundamental' : `${i}ª Inversión`;
                this.chordInspectorInversionSelect.appendChild(option);
            }
            this.chordInspectorInversionSelect.value = (currentInversion < numNotes ? currentInversion : 0).toString();
        }
    }
    
    // --- FUNCIÓN MODIFICADA: para mostrar/ocultar botones ---
    public showInspector: ShowInspectorFn = (item, callbacks): void => {
        if (!item) return;
        const isNewChord = item.id === undefined;
        this.currentInspectorItem = { ...item };
        this.currentInspectorCallbacks = callbacks || {};
        this.chordInspectorTitle.textContent = isNewChord ? 'Insertar Acorde' : 'Editar Acorde';
        this.populateSelects(this.currentInspectorItem);
        this.populateModificationsEditor(this.currentInspectorItem);
        this.chordInspectorPlayBtn.onclick = () => this.audioEngine.playChord(this.currentInspectorItem!);
        
        // Lógica para mostrar los botones correctos
        this.chordInspectorInsertBtn.style.display = isNewChord ? 'block' : 'none';
        this.chordInspectorSaveBtn.style.display = isNewChord ? 'none' : 'block';
        this.chordInspectorDeleteBtn.style.display = !isNewChord && this.currentInspectorCallbacks.onDelete ? 'block' : 'none';

        this.renderChordInspectorPiano(this.currentInspectorItem!);
        this.chordInspectorModal.classList.add('visible');
        this.chordInspectorOverlay.classList.add('visible');
    }
    
    // --- FUNCIÓN MODIFICADA: ya no guarda al cerrar ---
    public hideChordInspector = (): void => {
        this.chordInspectorModal.classList.remove('visible');
        this.chordInspectorOverlay.classList.remove('visible');
        this.currentInspectorItem = null;
        this.currentInspectorCallbacks = null;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new PianoApp();
});
