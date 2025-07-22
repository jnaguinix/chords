import type { ProcessedSong, SequenceItem, SongLine } from '../types';
import { MUSICAL_INTERVALS, SELECTOR_NOTES } from '../constants';
import { playChord } from '../core/audio';
import { getNotesForChordString } from '../core/chord-utils';
import { PianoRenderer } from '../core/piano-renderer';

interface ComposerDOMElements {
    rootNoteSelect: HTMLSelectElement;
    typeSelect: HTMLSelectElement;
    bassNoteSelect: HTMLSelectElement;
    inversionSelect: HTMLSelectElement;
    addToSequenceBtn: HTMLButtonElement;
    sequenceDisplay: HTMLElement;
    generateCompositionBtn: HTMLButtonElement;
    clearSequenceBtn: HTMLButtonElement;
    compositionOutput: HTMLElement;
    // New elements for Chord Replacement Modal
    chordReplacementOverlay: HTMLElement;
    chordReplacementModal: HTMLElement;
    replacementRootNoteSelect: HTMLSelectElement;
    replacementTypeSelect: HTMLSelectElement;
    replacementBassNoteSelect: HTMLSelectElement;
    replacementInversionSelect: HTMLSelectElement;
    replacementPlayBtn: HTMLButtonElement;
    replacementConfirmBtn: HTMLButtonElement;
    replacementCloseBtn: HTMLButtonElement;
    replacementPianoContainer: HTMLElement;
}

export class Composer {
    private elements: ComposerDOMElements;
    private showInspectorCallback: (item: SequenceItem) => void;

    private sequence: SequenceItem[] = [];
    private songLines: SongLine[] | null = null;
    private draggedItemIndex: number | null = null;
    private longPressTimer: number | null = null;
    private longPressTarget: HTMLElement | null = null;
    private isLongPress: boolean = false;
    private currentChordIndexToReplace: number | null = null;
    private replacementPianoRenderer: PianoRenderer;

    constructor(elements: ComposerDOMElements, showInspectorCallback: (item: SequenceItem) => void) {
        this.elements = elements;
        this.showInspectorCallback = showInspectorCallback;
        this.elements.inversionSelect = document.getElementById('composer-inversion-select') as HTMLSelectElement;

        // Initialize new elements for Chord Replacement Modal
        this.elements.chordReplacementOverlay = document.getElementById('chord-replacement-overlay') as HTMLElement;
        this.elements.chordReplacementModal = document.getElementById('chord-replacement-modal') as HTMLElement;
        this.elements.replacementRootNoteSelect = document.getElementById('replacement-root-note-select') as HTMLSelectElement;
        this.elements.replacementTypeSelect = document.getElementById('replacement-type-select') as HTMLSelectElement;
        this.elements.replacementBassNoteSelect = document.getElementById('replacement-bass-note-select') as HTMLSelectElement;
        this.elements.replacementInversionSelect = document.getElementById('replacement-inversion-select') as HTMLSelectElement;
        this.elements.replacementPlayBtn = document.getElementById('replacement-play-btn') as HTMLButtonElement;
        this.elements.replacementConfirmBtn = document.getElementById('replacement-confirm-btn') as HTMLButtonElement;
        this.elements.replacementCloseBtn = document.getElementById('chord-replacement-close-btn') as HTMLButtonElement;
        this.elements.replacementPianoContainer = document.getElementById('replacement-piano-container') as HTMLElement;

        this.replacementPianoRenderer = new PianoRenderer(this.elements.replacementPianoContainer);
    }

    public init(): void {
        this.populateSelectors();
        this.addEventListeners();
        this.updateButtonsState();
    }

    public setSong(song: ProcessedSong): void {
        this.sequence = [...song.allChords];
        this.songLines = song.lines;
        this.renderSequenceDisplay();
        this.updateButtonsState();
        this.handleGenerateComposition();
    }

    private populateSelectors(): void {
        [this.elements.rootNoteSelect, this.elements.bassNoteSelect].forEach((select, index) => {
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
            select.value = index === 1 ? 'none' : 'C';
        });

        Object.keys(MUSICAL_INTERVALS).forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            this.elements.typeSelect.appendChild(option);
        });
        this.elements.typeSelect.value = 'Mayor';

        // Populate Inversion selector
        for (let i = 0; i <= 3; i++) { // Assuming max 3 inversions for now, will adjust dynamically
            const option = document.createElement('option');
            option.value = i.toString();
            option.textContent = i === 0 ? 'Fundamental' : `${i}ª Inversión`;
            this.elements.inversionSelect.appendChild(option);
        }
        this.elements.inversionSelect.value = '0';
    }

    private populateReplacementSelectors(item: SequenceItem): void {
        // Clear previous options
        this.elements.replacementRootNoteSelect.innerHTML = '';
        this.elements.replacementTypeSelect.innerHTML = '';
        this.elements.replacementBassNoteSelect.innerHTML = '';
        this.elements.replacementInversionSelect.innerHTML = '';

        // Populate Root Note and Bass Note selectors
        [this.elements.replacementRootNoteSelect, this.elements.replacementBassNoteSelect].forEach((select, index) => {
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
        });

        // Populate Type selector
        Object.keys(MUSICAL_INTERVALS).forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            this.elements.replacementTypeSelect.appendChild(option);
        });

        // Populate Inversion selector
        for (let i = 0; i <= 3; i++) {
            const option = document.createElement('option');
            option.value = i.toString();
            option.textContent = i === 0 ? 'Fundamental' : `${i}ª Inversión`;
            this.elements.replacementInversionSelect.appendChild(option);
        }

        // Set initial values based on the chord being replaced
        this.elements.replacementRootNoteSelect.value = item.rootNote;
        this.elements.replacementTypeSelect.value = item.type;
        this.elements.replacementBassNoteSelect.value = item.bassNote || 'none';
        this.elements.replacementInversionSelect.value = item.inversion?.toString() || '0';
    }

    private addEventListeners(): void {
        this.elements.addToSequenceBtn.addEventListener('click', this.handleAddToSequence);
        this.elements.generateCompositionBtn.addEventListener('click', this.handleGenerateComposition);
        this.elements.clearSequenceBtn.addEventListener('click', this.handleClearSequence);
        this.elements.sequenceDisplay.addEventListener('click', this.handleRemoveFromSequence);
        
        // Event listeners for long press and play
        this.elements.sequenceDisplay.addEventListener('mousedown', this.handleMouseDown);
        this.elements.sequenceDisplay.addEventListener('mouseup', this.handleMouseUp);
        this.elements.sequenceDisplay.addEventListener('mouseleave', this.handleMouseLeave);
        this.elements.sequenceDisplay.addEventListener('click', this.handlePlayChordClick); // For short clicks

        this.elements.compositionOutput.addEventListener('mousedown', this.handleMouseDown);
        this.elements.compositionOutput.addEventListener('mouseup', this.handleMouseUp);
        this.elements.compositionOutput.addEventListener('mouseleave', this.handleMouseLeave);
        this.elements.compositionOutput.addEventListener('click', this.handleCompositionChordClick); // For short clicks

        // Chord Replacement Modal Event Listeners
        this.elements.chordReplacementOverlay.addEventListener('click', this.closeChordReplacementModal);
        this.elements.replacementCloseBtn.addEventListener('click', this.closeChordReplacementModal);
        this.elements.replacementPlayBtn.addEventListener('click', this.handleReplacementPlay);
        this.elements.replacementConfirmBtn.addEventListener('click', this.handleReplacementConfirm);
        this.elements.replacementRootNoteSelect.addEventListener('change', this.updateReplacementPiano);
        this.elements.replacementTypeSelect.addEventListener('change', this.updateReplacementPiano);
        this.elements.replacementBassNoteSelect.addEventListener('change', this.updateReplacementPiano);
        this.elements.replacementInversionSelect.addEventListener('change', this.updateReplacementPiano);

        this.elements.sequenceDisplay.addEventListener('dragstart', this.handleDragStart);
        this.elements.sequenceDisplay.addEventListener('dragover', this.handleDragOver);
        this.elements.sequenceDisplay.addEventListener('drop', this.handleDrop);
        this.elements.sequenceDisplay.addEventListener('dragend', this.handleDragEnd);
    }

    private handleAddToSequence = (): void => {
        const bassNote = this.elements.bassNoteSelect.value;
        const inversion = parseInt(this.elements.inversionSelect.value, 10);
        const newItem: SequenceItem = {
            rootNote: this.elements.rootNoteSelect.value,
            type: this.elements.typeSelect.value,
            inversion,
            ...(bassNote !== 'none' && { bassNote: bassNote })
        };
        this.sequence.push(newItem);
        this.songLines = null;
        this.renderSequenceDisplay();
        this.updateButtonsState();
        this.handleGenerateComposition();
    }

    private renderSequenceDisplay = (): void => {
        this.elements.sequenceDisplay.innerHTML = '';
        this.sequence.forEach((item, index) => {
            const tag = document.createElement('div');
            tag.className = 'sequence-item';
            tag.dataset.index = index.toString();
            tag.draggable = true;
            const chordName = item.type === 'Mayor' ? item.rootNote : (item.type === 'Menor' ? `${item.rootNote}m` : `${item.rootNote} ${item.type}`);
            let displayName = item.bassNote ? `${chordName} / ${item.bassNote}` : chordName;
            if (item.inversion && item.inversion > 0) {
                displayName += ` (${item.inversion}ª Inv.)`;
            }
            tag.innerHTML = `
                <span class="playable-chord" data-chord-string="${displayName}">${displayName}</span>
                <button class="remove-btn" data-index="${index}" aria-label="Eliminar acorde">&times;</button>
            `;
            this.elements.sequenceDisplay.appendChild(tag);
        });
    }

    private handleRemoveFromSequence = (e: Event): void => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('remove-btn')) {
            const index = parseInt(target.dataset.index!, 10);
            this.sequence.splice(index, 1);
            this.songLines = null;
            this.renderSequenceDisplay();
            this.updateButtonsState();
            this.handleGenerateComposition();
        }
    }

    private updateButtonsState = (): void => {
        const hasItems = this.sequence.length > 0;
        this.elements.generateCompositionBtn.disabled = !hasItems;
        this.elements.clearSequenceBtn.disabled = !hasItems;
    }

    private handleClearSequence = (): void => {
        this.sequence = [];
        this.songLines = null;
        this.renderSequenceDisplay();
        this.elements.compositionOutput.innerHTML = '';
        this.elements.compositionOutput.className = 'composition-output';
        this.updateButtonsState();
    }

    private handleGenerateComposition = (): void => {
        this.elements.compositionOutput.innerHTML = '';

        if (this.songLines) {
            this.elements.compositionOutput.className = 'song-sheet-container';
            this.renderComposerSongSheet(this.songLines);
        } else if (this.sequence.length > 0) {
            this.elements.compositionOutput.className = 'composition-output';
            this.sequence.forEach((item, index) => {
                const chordName = item.type === 'Mayor' ? item.rootNote : (item.type === 'Menor' ? `${item.rootNote}m` : `${item.rootNote} ${item.type}`);
                let displayName = item.bassNote ? `${chordName} / ${item.bassNote}` : chordName;
                if (item.inversion && item.inversion > 0) {
                    displayName += ` (${item.inversion}ª Inv.)`;
                }
                
                const actionButton = document.createElement('button');
                actionButton.className = 'composer-chord-action playable-chord'; // Added playable-chord class
                actionButton.textContent = displayName;
                actionButton.dataset.index = index.toString();
                actionButton.dataset.chordString = displayName; // Added data-chord-string
                
                this.elements.compositionOutput.appendChild(actionButton);
            });
        } else {
            this.elements.compositionOutput.className = 'composition-output';
        }
    }

    private renderComposerSongSheet(lines: SongLine[]): void {
        let chordRenderIndex = 0;
        lines.forEach(line => {
            const lineDiv = document.createElement('div');
            lineDiv.className = 'song-line';
            lineDiv.textContent = line.lyrics || '\u00A0'; // Use non-breaking space for empty lines
            line.chords.forEach(chord => {
                const chordSpan = document.createElement('span');

                if (chord.isAnnotation) {
                    chordSpan.className = 'chord-annotation';
                } else {
                    chordSpan.className = 'chord-action playable-chord'; // Added playable-chord class
                    if (line.isInstrumental) {
                        chordSpan.classList.add('instrumental');
                    }
                    chordSpan.dataset.index = chordRenderIndex.toString();
                    chordSpan.dataset.chordString = chord.chord; // Added data-chord-string
                    chordRenderIndex++;
                }

                chordSpan.textContent = chord.chord;
                chordSpan.style.left = `${chord.position}ch`;
                lineDiv.appendChild(chordSpan);
            });
            this.elements.compositionOutput.appendChild(lineDiv);
        });
    }

    private handleCompositionChordClick = (e: Event): void => {
        if (this.isLongPress) {
            this.isLongPress = false; // Reset flag
            return; // Do not trigger short click action after a long press
        }
        const target = e.target as HTMLElement;
        const chordActionEl = target.closest('.composer-chord-action, .chord-action');
        if (chordActionEl) {
            const chordString = (chordActionEl as HTMLElement).dataset.chordString; // Get chord string
            if (chordString) {
                const notes = getNotesForChordString(chordString);
                if (notes.length > 0) {
                    playChord(notes); // Play the chord
                }
            }

            const chordIndexStr = (chordActionEl as HTMLElement).dataset.index;
            if (chordIndexStr) {
                const chordIndex = parseInt(chordIndexStr, 10);
                if (!isNaN(chordIndex)) {
                    const item = this.sequence[chordIndex];
                    if (item) this.showInspectorCallback(item);
                }
            }
        }
    }

    private handlePlayChordClick = (e: Event): void => {
        if (this.isLongPress) {
            this.isLongPress = false; // Reset flag
            return; // Do not trigger short click action after a long press
        }
        const target = e.target as HTMLElement;
        const playableChordEl = target.closest('.playable-chord');
        if (playableChordEl) {
            const chordString = (playableChordEl as HTMLElement).dataset.chordString;
            if (chordString) {
                const notes = getNotesForChordString(chordString);
                if (notes.length > 0) {
                    playChord(notes);
                }
            }
        }
    }

    private handleMouseDown = (e: MouseEvent): void => {
        const target = e.target as HTMLElement;
        const playableChordEl = target.closest('.playable-chord');
        if (playableChordEl) {
            this.longPressTarget = playableChordEl as HTMLElement;
            this.isLongPress = false;
            this.longPressTimer = window.setTimeout(() => {
                this.isLongPress = true;
                const chordIndexStr = (playableChordEl as HTMLElement).dataset.index;
                if (chordIndexStr) {
                    const chordIndex = parseInt(chordIndexStr, 10);
                    if (!isNaN(chordIndex)) {
                        this.currentChordIndexToReplace = chordIndex;
                        this.openChordReplacementModal(this.sequence[chordIndex]);
                    }
                }
            }, 500); // 500ms for long press
        }
    };

    private openChordReplacementModal = (item: SequenceItem): void => {
        this.elements.chordReplacementOverlay.style.display = 'block';
        this.elements.chordReplacementModal.style.display = 'block';
        this.populateReplacementSelectors(item);
        this.updateReplacementPiano();
    };

    private closeChordReplacementModal = (): void => {
        this.elements.chordReplacementOverlay.style.display = 'none';
        this.elements.chordReplacementModal.style.display = 'none';
        this.currentChordIndexToReplace = null;
    };

    private handleMouseUp = (): void => {
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
        this.longPressTarget = null;
    };

    private handleMouseLeave = (e: MouseEvent): void => {
        const target = e.target as HTMLElement;
        // Only clear if mouse leaves the element that initiated the long press
        if (this.longPressTarget && !target.closest('.playable-chord')) {
            if (this.longPressTimer) {
                clearTimeout(this.longPressTimer);
                this.longPressTimer = null;
            }
            this.longPressTarget = null;
            this.isLongPress = false;
        }
    };

    private handleReplacementPlay = (): void => {
        const newChordString = this.getNewChordStringFromModal();
        if (newChordString) {
            const notes = getNotesForChordString(newChordString);
            if (notes.length > 0) {
                playChord(notes);
            }
        }
    };

    private handleReplacementConfirm = (): void => {
        if (this.currentChordIndexToReplace !== null) {
            const newRootNote = this.elements.replacementRootNoteSelect.value;
            const newType = this.elements.replacementTypeSelect.value;
            const newBassNote = this.elements.replacementBassNoteSelect.value;
            const newInversion = parseInt(this.elements.replacementInversionSelect.value, 10);

            const newChord: SequenceItem = {
                rootNote: newRootNote,
                type: newType,
                inversion: newInversion,
                ...(newBassNote !== 'none' && { bassNote: newBassNote })
            };

            this.sequence[this.currentChordIndexToReplace] = newChord;
            this.songLines = null; // Invalidate song lines to regenerate
            this.renderSequenceDisplay();
            this.handleGenerateComposition();
            this.closeChordReplacementModal();
        }
    };

    private updateReplacementPiano = (): void => {
        const newRootNote = this.elements.replacementRootNoteSelect.value;
        const newType = this.elements.replacementTypeSelect.value;
        const newBassNote = this.elements.replacementBassNoteSelect.value;
        const newInversion = parseInt(this.elements.replacementInversionSelect.value, 10);

        const newChordString = this.getNewChordStringFromModal();
        const notesToHighlight = getNotesForChordString(newChordString);
        this.replacementPianoRenderer.renderPiano(notesToHighlight);
    };

    private getNewChordStringFromModal = (): string => {
        const rootNote = this.elements.replacementRootNoteSelect.value;
        const type = this.elements.replacementTypeSelect.value;
        const bassNote = this.elements.replacementBassNoteSelect.value;
        const inversion = parseInt(this.elements.replacementInversionSelect.value, 10);

        let chordName = type === 'Mayor' ? rootNote : (type === 'Menor' ? `${rootNote}m` : `${rootNote} ${type}`);
        let displayName = bassNote !== 'none' ? `${chordName} / ${bassNote}` : chordName;
        if (inversion > 0) {
            displayName += `^${inversion}`; // Use ^ for inversion in chord string
        }
        return displayName;
    };

    // --- Drag and Drop Handlers ---
    private handleDragStart = (e: DragEvent): void => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('sequence-item')) {
            this.draggedItemIndex = parseInt(target.dataset.index!);
            target.classList.add('dragging');
            if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
        }
    }

    private handleDragOver = (e: DragEvent): void => {
        e.preventDefault();
        const container = this.elements.sequenceDisplay;
        const draggingItem = container.querySelector('.dragging');
        if (!draggingItem) return;
        const afterElement = this.getDragAfterElement(container, e.clientY);
        if (afterElement == null) {
            container.appendChild(draggingItem);
        } else {
            container.insertBefore(draggingItem, afterElement);
        }
    }

    private getDragAfterElement(container: HTMLElement, y: number) {
        const draggableElements = [...container.querySelectorAll('.sequence-item:not(.dragging)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child as Element };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY, element: null as Element | null }).element;
    }

    private handleDrop = (e: DragEvent): void => {
        e.preventDefault();
        const draggedEl = this.elements.sequenceDisplay.querySelector('.dragging');
        if (draggedEl && this.draggedItemIndex !== null) {
            const newIndex = Array.from(this.elements.sequenceDisplay.children).indexOf(draggedEl);
            const [item] = this.sequence.splice(this.draggedItemIndex, 1);
            this.sequence.splice(newIndex, 0, item);
            this.songLines = null;
        }
    }

    private handleDragEnd = (e: DragEvent): void => {
        const draggedEl = (e.target as HTMLElement);
        draggedEl.classList.remove('dragging');
        this.draggedItemIndex = null;
        this.renderSequenceDisplay();
        this.handleGenerateComposition();
    }
}