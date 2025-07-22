import { applyTransposition, parseSongText } from '../core/chord-utils';
import type { ProcessedSong, SequenceItem, SongLine } from '../types';

interface ExtractorDOMElements {
    songInput: HTMLTextAreaElement;
    processSongBtn: HTMLButtonElement;
    addToComposerBtn: HTMLButtonElement;
    loader: HTMLElement;
    songOutput: HTMLElement;
    transpositionControls: HTMLElement;
    transposeUpBtn: HTMLButtonElement;
    transposeDownBtn: HTMLButtonElement;
    transpositionDisplay: HTMLElement;
}

interface ExtractorCallbacks {
    showInspector: (item: SequenceItem) => void;
    addToComposer: (song: ProcessedSong) => void;
}

export class Extractor {
    private elements: ExtractorDOMElements;
    private callbacks: ExtractorCallbacks;
    
    private originalParsedSong: ProcessedSong | null = null;
    private currentDisplayedSong: ProcessedSong | null = null;
    private transpositionOffset = 0;

    constructor(elements: ExtractorDOMElements, callbacks: ExtractorCallbacks) {
        this.elements = elements;
        this.callbacks = callbacks;
    }

    public init(): void {
        this.addEventListeners();
    }

    private addEventListeners(): void {
        this.elements.processSongBtn.addEventListener('click', this.handleProcessSong);
        this.elements.addToComposerBtn.addEventListener('click', this.handleAddToComposer);
        this.elements.transposeUpBtn.addEventListener('click', () => this.handleTranspose(1));
        this.elements.transposeDownBtn.addEventListener('click', () => this.handleTranspose(-1));
        this.elements.songOutput.addEventListener('click', this.handleChordClick);
    }

    private handleProcessSong = (): void => {
        const songText = this.elements.songInput.value;
        if (!songText.trim()) return;

        this.elements.loader.style.display = 'flex';
        this.elements.songOutput.innerHTML = '';
        this.elements.addToComposerBtn.disabled = true;
        this.elements.processSongBtn.disabled = true;
        this.elements.transpositionControls.style.display = 'none';
        
        setTimeout(() => {
            try {
                this.originalParsedSong = parseSongText(songText);
                this.transpositionOffset = 0;
                this.updateDisplayedSong();
                this.elements.addToComposerBtn.disabled = !this.currentDisplayedSong || this.currentDisplayedSong.allChords.length === 0;
                this.elements.transpositionControls.style.display = 'flex';
            } catch (error) {
                console.error("Error al procesar la canción:", error);
                this.elements.songOutput.textContent = "Hubo un error al analizar la canción.";
            } finally {
                this.elements.loader.style.display = 'none';
                this.elements.processSongBtn.disabled = false;
            }
        }, 200);
    }

    private updateDisplayedSong = (): void => {
        if (!this.originalParsedSong) return;
        
        this.currentDisplayedSong = applyTransposition(this.originalParsedSong, this.transpositionOffset);
        this.renderSongSheet(this.currentDisplayedSong.lines);
        
        if (this.transpositionOffset === 0) {
            this.elements.transpositionDisplay.textContent = 'Tonalidad Original';
        } else {
            const sign = this.transpositionOffset > 0 ? '+' : '';
            this.elements.transpositionDisplay.textContent = `${sign}${this.transpositionOffset} Semitonos`;
        }
    }

    private renderSongSheet(lines: SongLine[]): void {
        this.elements.songOutput.innerHTML = '';
        this.elements.songOutput.className = 'song-sheet-container'; // Ensure class is set
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
                    chordSpan.dataset.chordIndex = chordRenderIndex.toString();
                    chordRenderIndex++;
                }

                chordSpan.textContent = chord.chord;
                chordSpan.style.left = `${chord.position}ch`;
                lineDiv.appendChild(chordSpan);
            });
            this.elements.songOutput.appendChild(lineDiv);
        });
    }

    private handleAddToComposer = (): void => {
        if (this.currentDisplayedSong) {
            this.callbacks.addToComposer(this.currentDisplayedSong);
        }
    }

    private handleTranspose = (semitones: number): void => {
        if (!this.originalParsedSong) return;
        this.transpositionOffset += semitones;
        this.updateDisplayedSong();
    }

    private handleChordClick = (e: Event): void => {
        const target = e.target as HTMLElement;
        const chordActionEl = target.closest('.chord-action');
        if (chordActionEl && this.currentDisplayedSong) {
            const chordIndexStr = (chordActionEl as HTMLElement).dataset.chordIndex;
            if(chordIndexStr) {
                const chordIndex = parseInt(chordIndexStr, 10);
                if (!isNaN(chordIndex)) {
                    const item = this.currentDisplayedSong.allChords[chordIndex];
                    if (item) {
                        this.callbacks.showInspector(item);
                    }
                }
            }
        }
    }
}
