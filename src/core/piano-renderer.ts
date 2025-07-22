import { IS_BLACK_KEY, INDEX_TO_DISPLAY_NAME } from '../constants';

export function createPiano(
    container: HTMLElement, 
    startNote: number, 
    endNote: number, 
    notesToPress: number[], 
    isMini = false, 
    bassNoteIndex: number | null = null,
    onKeyClick?: (noteIndex: number) => void
): void {
    container.innerHTML = ''; // Clear the container first

    // Create the actual piano element that will be nested inside the container
    const pianoEl = document.createElement('div');
    pianoEl.className = `piano ${isMini ? 'mini-piano' : ''}`;
    pianoEl.setAttribute('aria-label', isMini ? 'Mini piano' : 'Piano virtual');

    // La lógica de cálculo de rango ahora se hace ANTES de llamar a esta función.
    // La siguiente línea ha sido eliminada para que la función confíe en los parámetros de entrada.
    // ELIMINADO: const finalStartNote = bassNoteIndex !== null ? Math.min(startNote, bassNoteIndex, 24) : startNote;

    for (let i = startNote; i <= endNote; i++) { // Usamos startNote y endNote directamente
        const noteIndexMod = i < 0 ? 12 + (i % 12) : i % 12;
        if (IS_BLACK_KEY[noteIndexMod]) continue;

        const noteName = INDEX_TO_DISPLAY_NAME[noteIndexMod];
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
        const nextNoteIndexMod = nextNoteIndex < 0 ? 12 + (nextNoteIndex % 12) : nextNoteIndex % 12;
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
        // Append the key to the new piano element, not the container
        pianoEl.appendChild(whiteKey);
    }

    // Append the finished piano to the container
    container.appendChild(pianoEl);
}