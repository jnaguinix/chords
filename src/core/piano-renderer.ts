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

                // --- LÓGICA DEL TOOLTIP CORREGIDA ---
                const globalTooltip = document.getElementById('global-tooltip') as HTMLElement;
                visualEl.addEventListener('mouseenter', () => {
                    globalTooltip.textContent = formatChordName(chord, { style: 'long' }, callbacks.transposition);
                    
                    const rect = visualEl.getBoundingClientRect();
                    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
                    const scrollY = window.pageYOffset || document.documentElement.scrollTop;

                    // Medir el tooltip fuera de la pantalla para obtener su ancho real
                    globalTooltip.style.visibility = 'hidden';
                    globalTooltip.style.left = '-1000px';
                    globalTooltip.style.top = '-1000px';
                    globalTooltip.style.transform = 'none';
                    globalTooltip.style.visibility = 'visible';
                    const tooltipWidth = globalTooltip.offsetWidth;
                    const tooltipHeight = globalTooltip.offsetHeight;
                    globalTooltip.style.visibility = 'hidden';

                    // Calcular posición inicial (idealmente centrada)
                    let tooltipLeft = rect.left + scrollX + (rect.width / 2) - (tooltipWidth / 2);
                    const tooltipTop = rect.top + scrollY - tooltipHeight - 5; // 5px de margen

                    // --- COMPROBACIÓN DE BORDES (Edge Detection) ---
                    const viewportWidth = window.innerWidth;
                    const rightEdge = tooltipLeft + tooltipWidth;

                    // Si se sale por la derecha, lo alineamos al borde derecho de la pantalla
                    if (rightEdge > viewportWidth - 10) { // 10px de margen de seguridad
                        tooltipLeft = viewportWidth - tooltipWidth - 10;
                    }
                    // Si se sale por la izquierda, lo alineamos al borde izquierdo
                    if (tooltipLeft < 10) {
                        tooltipLeft = 10;
                    }
                    
                    // Aplicar posición final
                    globalTooltip.style.left = `${tooltipLeft}px`;
                    globalTooltip.style.top = `${tooltipTop}px`;
                    globalTooltip.style.transform = 'none'; // Ya no se necesita el translateX(-50%)
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
