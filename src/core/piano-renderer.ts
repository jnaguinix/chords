import { IS_BLACK_KEY, INDEX_TO_SHARP_NAME } from '../constants'; // <-- CAMBIO AQUÍ
import { formatChordName } from './chord-utils';
import type { SongLine, SequenceItem, SongChord } from '../types';

// La función createPiano no cambia y permanece como está.
export function createPiano(
    container: HTMLElement, 
    startNote: number, 
    endNote: number, 
    notesToPress: number[], 
    isMini = false, 
    bassNoteIndex: number | null = null,
    onKeyClick?: (noteIndex: number) => void
): void {
    container.innerHTML = ''; 

    const pianoEl = document.createElement('div');
    pianoEl.className = `piano ${isMini ? 'mini-piano' : ''}`;
    pianoEl.setAttribute('aria-label', isMini ? 'Mini piano' : 'Piano virtual');

    for (let i = startNote; i <= endNote; i++) {
        const noteIndexMod = (i % 12 + 12) % 12;
        if (IS_BLACK_KEY[noteIndexMod]) continue;

        const noteName = INDEX_TO_SHARP_NAME[noteIndexMod]; // <-- Y CAMBIO AQUÍ
        const whiteKey = document.createElement('div');
        whiteKey.className = 'key white';
        
        const isBassKey = bassNoteIndex !== null && i === bassNoteIndex;
        if (isBassKey) { whiteKey.classList.add('bass-note'); } 
        else if (notesToPress.includes(i)) { whiteKey.classList.add('pressed'); }
        
        if (!isMini) {
            const whiteKeyNameSpan = document.createElement('span');
            whiteKeyNameSpan.className = 'note-name';
            whiteKeyNameSpan.textContent = noteName;
            whiteKey.appendChild(whiteKeyNameSpan);
            if (onKeyClick) {
                whiteKey.addEventListener('click', () => onKeyClick(i));
            }
        }

        const nextNoteIndex = i + 1;
        const nextNoteIndexMod = (nextNoteIndex % 12 + 12) % 12;
        if (nextNoteIndex <= endNote && IS_BLACK_KEY[nextNoteIndexMod]) {
            const blackKey = document.createElement('div');
            blackKey.className = 'key black';
            
            const isBlackBassKey = bassNoteIndex !== null && nextNoteIndex === bassNoteIndex;
            if (isBlackBassKey) { blackKey.classList.add('bass-note'); } 
            else if (notesToPress.includes(nextNoteIndex)) { blackKey.classList.add('pressed'); }

            if (!isMini && onKeyClick) {
                blackKey.addEventListener('click', (e) => {
                    e.stopPropagation();
                    onKeyClick(nextNoteIndex);
                });
            }
            whiteKey.appendChild(blackKey);
        }
        pianoEl.appendChild(whiteKey);
    }
    
    container.appendChild(pianoEl);
}


interface SongSheetCallbacks {
    onShortClick: (item: SequenceItem) => void;
    onLongClick: (item: SequenceItem) => void;
    transposition: number; // Añadir la propiedad de transposición
}

// =========================================================================
// ========= ESTA ES LA FUNCIÓN MODIFICADA PARA LA NUEVA LÓGICA CSS ========
// =========================================================================
export function createSongSheet(
    container: HTMLElement,
    lines: SongLine[],
    callbacks: SongSheetCallbacks,
    // --- CAMBIO AQUÍ: Se eliminó el parámetro 'transposition' no utilizado ---
): void {
    container.innerHTML = '';
    container.className = 'song-sheet-container';

    lines.forEach((line, lineIndex) => {
        const lineEl = document.createElement('div');
        lineEl.className = 'song-line';
        lineEl.dataset.lineIndex = lineIndex.toString();

        const chordsLayer = document.createElement('div');
        chordsLayer.className = 'chords-layer';

        const lyricsLayer = document.createElement('div');
        lyricsLayer.className = 'lyrics-layer';
        lyricsLayer.textContent = line.lyrics || '\u00A0'; // \u00A0 es un espacio 'no rompible' para mantener la altura

        line.chords.forEach((songChord: SongChord) => {
            const chord = songChord.chord;
            const position = songChord.position;
            const isAnnotation = songChord.isAnnotation;

            // CAMBIO: Creamos un span exterior para el POSICIONAMIENTO
            const positionerEl = document.createElement('span');
            positionerEl.className = 'chord-positioner';
            // El posicionamiento con 'ch' se aplica al elemento exterior
            positionerEl.style.left = `${position}ch`;

            // CAMBIO: Creamos un span interior para la APARIENCIA y la INTERACCIÓN
            const visualEl = document.createElement('span');
            visualEl.className = 'chord-visual'; // Nueva clase para el estilo
            visualEl.textContent = formatChordName(chord, { style: 'short' }, callbacks.transposition); // Siempre usar formatChordName con transposición
            
            if (isAnnotation) {
                visualEl.classList.add('chord-annotation');
            } else {
                visualEl.classList.add('chord-action'); // La interacción se aplica al visual
                if (line.isInstrumental) {
                    visualEl.classList.add('instrumental');
                }

                // Lógica de clic corto vs. clic largo
                let clickTimer: number | null = null;
                const longClickDuration = 500;

                visualEl.addEventListener('mousedown', () => {
                    clickTimer = window.setTimeout(() => {
                        callbacks.onLongClick(chord);
                        clickTimer = null;
                    }, longClickDuration);
                });

                const clearTimer = () => {
                    if (clickTimer !== null) {
                        clearTimeout(clickTimer);
                    }
                };

                visualEl.addEventListener('mouseup', () => {
                    if (clickTimer !== null) {
                        clearTimeout(clickTimer);
                        callbacks.onShortClick(chord);
                    }
                });

                // Manejo del tooltip global
                const globalTooltip = document.getElementById('global-tooltip') as HTMLElement;
                // --- CAMBIO AQUÍ: Se eliminó el parámetro 'e' no utilizado ---
                visualEl.addEventListener('mouseenter', () => {
                    const rect = visualEl.getBoundingClientRect();
                    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
                    const scrollY = window.pageYOffset || document.documentElement.scrollTop;

                    globalTooltip.textContent = formatChordName(chord, { style: 'long' }, callbacks.transposition);

                    // Temporarily make visible to get accurate height
                    globalTooltip.style.visibility = 'hidden'; // Keep hidden for now
                    globalTooltip.style.opacity = '0';
                    globalTooltip.style.left = '0px'; // Position off-screen to measure
                    globalTooltip.style.top = '0px';
                    globalTooltip.style.transform = 'none'; // Reset transform for measurement
                    globalTooltip.style.visibility = 'visible'; // Make visible to measure
                    const tooltipHeight = globalTooltip.offsetHeight;
                    globalTooltip.style.visibility = 'hidden'; // Hide again

                    // Calculate final position
                    const tooltipLeft = rect.left + scrollX + (rect.width / 2);
                    const tooltipTop = rect.top + scrollY - tooltipHeight - 5; // 5px margin above visualEl

                    globalTooltip.style.left = `${tooltipLeft}px`;
                    globalTooltip.style.top = `${tooltipTop}px`;
                    globalTooltip.style.transform = 'translateX(-50%)'; // Only horizontal centering
                    globalTooltip.style.opacity = '1';
                    globalTooltip.style.visibility = 'visible';
                });

                visualEl.addEventListener('mouseleave', () => {
                    globalTooltip.style.opacity = '0';
                    globalTooltip.style.visibility = 'hidden';
                });

                visualEl.addEventListener('mouseleave', clearTimer);
            }
            
            // CAMBIO: Anidamos el visual dentro del posicionador
            positionerEl.appendChild(visualEl);
            chordsLayer.appendChild(positionerEl);
        });

        lineEl.appendChild(chordsLayer);
        lineEl.appendChild(lyricsLayer);
        container.appendChild(lineEl);
    });
}
