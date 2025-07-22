import type { ProcessedSong, SequenceItem, SongLine } from '../types';
import { MUSICAL_INTERVALS, SELECTOR_NOTES } from '../constants';

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
}

export class Composer {
    private elements: ComposerDOMElements;
    private showInspectorCallback: (item: SequenceItem) => void;

    private sequence: SequenceItem[] = [];
    private songLines: SongLine[] | null = null;
    private draggedItemIndex: number | null = null;

    constructor(elements: ComposerDOMElements, showInspectorCallback: (item: SequenceItem) => void) {
        this.elements = elements;
        this.showInspectorCallback = showInspectorCallback;
        this.elements.inversionSelect = document.getElementById('composer-inversion-select') as HTMLSelectElement;
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

    private addEventListeners(): void {
        this.elements.addToSequenceBtn.addEventListener('click', this.handleAddToSequence);
        this.elements.generateCompositionBtn.addEventListener('click', this.handleGenerateComposition);
        this.elements.clearSequenceBtn.addEventListener('click', this.handleClearSequence);
        this.elements.sequenceDisplay.addEventListener('click', this.handleRemoveFromSequence);
        this.elements.sequenceDisplay.addEventListener('dragstart', this.handleDragStart);
        this.elements.sequenceDisplay.addEventListener('dragover', this.handleDragOver);
        this.elements.sequenceDisplay.addEventListener('drop', this.handleDrop);
        this.elements.sequenceDisplay.addEventListener('dragend', this.handleDragEnd);
        this.elements.compositionOutput.addEventListener('click', this.handleCompositionChordClick);
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
                <span>${displayName}</span>
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
                actionButton.className = 'composer-chord-action';
                actionButton.textContent = displayName;
                actionButton.dataset.index = index.toString();
                
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
                    chordSpan.className = 'chord-action';
                    if (line.isInstrumental) {
                        chordSpan.classList.add('instrumental');
                    }
                    chordSpan.dataset.index = chordRenderIndex.toString();
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
        const target = e.target as HTMLElement;
        const chordActionEl = target.closest('.composer-chord-action, .chord-action');
        if (chordActionEl) {
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