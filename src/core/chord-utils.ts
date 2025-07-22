// CORRECCIÓN 1: Se eliminó IS_BLACK_KEY de esta importación.
import { NOTE_TO_INDEX, MUSICAL_INTERVALS, INDEX_TO_DISPLAY_NAME, CHORD_TYPE_MAP } from '../constants';
import type { SequenceItem, ProcessedSong, SongLine, SongChord } from '../types';

// CORRECCIÓN 2: Se eliminó el parámetro 'forVisualsOnly' que ya no se usa.
export function getChordNotes(item: SequenceItem): { notesToPress: number[], bassNoteIndex: number | null, allNotesForRange: number[] } {
    const rootNoteIndex = NOTE_TO_INDEX[item.rootNote];
    const intervals = MUSICAL_INTERVALS[item.type];
    if (rootNoteIndex === undefined || !intervals) {
        return { notesToPress: [], bassNoteIndex: null, allNotesForRange: [] };
    }

    // 1. Empezamos con el acorde en su posición fundamental en una octava intermedia (C3).
    const chordBaseAbsoluteIndex = rootNoteIndex + 12 * 3; // Octava C3
    const fundamentalChordNotes = intervals.map(interval => chordBaseAbsoluteIndex + interval);
    fundamentalChordNotes.sort((a, b) => a - b);

    // 2. Calculamos y "bloqueamos" la posición del bajo AHORA, basándonos en el acorde fundamental.
    let bassAbsoluteIndex: number | null = null;
    const bassNoteName = item.bassNote || item.rootNote;
    const bassNoteIndexMod12 = NOTE_TO_INDEX[bassNoteName];

    if (bassNoteIndexMod12 !== undefined) {
        const lowestFundamentalNote = fundamentalChordNotes[0];
        // Colocamos el bajo en la octava inmediatamente inferior a la del acorde fundamental.
        let tempBassIndex = bassNoteIndexMod12 + (Math.floor(lowestFundamentalNote / 12)) * 12;
        if (tempBassIndex >= lowestFundamentalNote) {
            tempBassIndex -= 12;
        }
        bassAbsoluteIndex = tempBassIndex; // ¡Bajo bloqueado!
    }

    // 3. AHORA, tomamos las notas del acorde y les aplicamos la inversión.
    let chordAbsoluteIndices = [...fundamentalChordNotes]; // Hacemos una copia para invertirla.
    if (item.inversion && item.inversion > 0) {
        for (let i = 0; i < item.inversion; i++) {
            // La lógica de inversión sube la nota más grave una octava.
            const lowestNote = chordAbsoluteIndices.shift(); // Extrae la primera (más grave)
            if (lowestNote !== undefined) {
                chordAbsoluteIndices.push(lowestNote + 12);
            }
            chordAbsoluteIndices.sort((a, b) => a - b); // Reordenar para la siguiente inversión
        }
    }
    
    const allNotesForRange = [...chordAbsoluteIndices, ...(bassAbsoluteIndex !== null ? [bassAbsoluteIndex] : [])];
    return { 
        notesToPress: chordAbsoluteIndices, 
        bassNoteIndex: bassAbsoluteIndex, 
        allNotesForRange 
    };
}


export function parseChordString(chord: string): SequenceItem | null {
    const sanitizedChord = chord.trim();
    if (!sanitizedChord) return null;

    const parts = sanitizedChord.split('/');
    let mainChord = parts[0].trim();
    const bassNote = parts.length > 1 ? parts[1].trim() : undefined;
    let rootNote: string;
    let typeSuffix: string;
    let inversion: number | undefined;

    // Extract inversion first
    const inversionMatch = mainChord.match(/\^(\d+)$/);
    if (inversionMatch) {
        inversion = parseInt(inversionMatch[1], 10);
        mainChord = mainChord.substring(0, inversionMatch.index);
    }

    if (mainChord.length > 1 && (mainChord[1] === '#' || mainChord[1] === 'b')) {
        rootNote = mainChord.substring(0, 2);
        typeSuffix = mainChord.substring(2);
    } else {
        rootNote = mainChord.substring(0, 1);
        typeSuffix = mainChord.substring(1);
    }

    if (NOTE_TO_INDEX[rootNote] === undefined || (bassNote && NOTE_TO_INDEX[bassNote] === undefined)) return null;
    
    // Check for exact suffix matches first (most specific to least specific)
    for (const key of Object.keys(CHORD_TYPE_MAP).sort((a, b) => b.length - a.length)) {
        if (typeSuffix === key) {
            return { rootNote, type: CHORD_TYPE_MAP[key], bassNote, inversion };
        }
    }
    
    // If no suffix, it's a major chord
    if (typeSuffix === '') {
        return { rootNote, type: 'Mayor', bassNote, inversion };
    }

    return null; // Return null if suffix is not recognized
}


export function parseSongText(songText: string): ProcessedSong {
    // Replace tabs with 4 spaces to ensure consistent alignment.
    songText = songText.replace(/\t/g, '    ');
    
    const rawLines = songText.split('\n');
    const processedLines: SongLine[] = [];
    const allChords: SequenceItem[] = [];

    const isChordLine = (line: string): boolean => {
        const tokens = line.trim().split(/\s+/).filter(Boolean);
        if (tokens.length === 0) return false;
        
        const chordCount = tokens.filter(token => {
            const parsed = parseChordString(token);
            // Consider it a valid chord if it parses OR it's an annotation in parentheses
            return parsed !== null || (token.startsWith('(') && token.endsWith(')'));
        }).length;

        // A line is a chord line if it has at least one valid-looking token
        // and the proportion of such tokens is high. This handles lines with mixed annotations.
        return chordCount > 0 && (chordCount / tokens.length) >= 0.5;
    };

    let i = 0;
    while (i < rawLines.length) {
        let currentLine = rawLines[i];
        
        if (isChordLine(currentLine)) {
            // Expand parenthesized chords, e.g., (G-A) becomes G A
            currentLine = currentLine.replace(/\(([^)]+)\)/g, (_match, inner) => {
                return ` ${inner.replace(/-/g, ' ')} `;
            });

            const songChords: SongChord[] = [];
            const chordRegex = /(\S+)/g;
            let match;
            while ((match = chordRegex.exec(currentLine)) !== null) {
                const chordStr = match[1];
                const parsedChord = parseChordString(chordStr);
                if (parsedChord) {
                    songChords.push({ chord: chordStr, position: match.index });
                    allChords.push(parsedChord);
                } else {
                    // This is an annotation like (Intro) or some other non-chord text
                    songChords.push({ chord: chordStr, position: match.index, isAnnotation: true });
                }
            }

            const nextLine = (i + 1 < rawLines.length) ? rawLines[i + 1] : null;
            
            // If the next line exists and is NOT a chord line, pair them up.
            if (nextLine !== null && !isChordLine(nextLine)) {
                processedLines.push({
                    lyrics: nextLine.trimEnd(),
                    chords: songChords,
                    isInstrumental: false
                });
                i += 2; // Move past both chord and lyric lines
            } else {
                // This is an instrumental line (or the last line of the song)
                processedLines.push({
                    lyrics: '', // No lyrics associated
                    chords: songChords,
                    isInstrumental: true
                });
                i += 1; // Move past only the chord line
            }
        } else {
            // This is a line of lyrics, comments, or an empty line
            processedLines.push({
                lyrics: currentLine.trimEnd(),
                chords: [],
                isInstrumental: false
            });
            i += 1;
        }
    }

    return { lines: processedLines, allChords };
}


function transposeNote(note: string, semitones: number): string {
    const currentIndex = NOTE_TO_INDEX[note];
    if (currentIndex === undefined) return note;
    const newIndex = (currentIndex + semitones % 12 + 12) % 12;
    return INDEX_TO_DISPLAY_NAME[newIndex];
};

export function applyTransposition(originalSong: ProcessedSong, transpositionOffset: number): ProcessedSong {
    const transposedSong: ProcessedSong = JSON.parse(JSON.stringify(originalSong));
    
    transposedSong.allChords.forEach(chord => {
        chord.rootNote = transposeNote(chord.rootNote, transpositionOffset);
        if (chord.bassNote) {
            chord.bassNote = transposeNote(chord.bassNote, transpositionOffset);
        }
    });

    transposedSong.lines.forEach(line => {
        line.chords.forEach(songChord => {
            if (songChord.isAnnotation) {
                return; // Don't transpose annotations
            }
            const parsed = parseChordString(songChord.chord);
            if (parsed) {
                const newRoot = transposeNote(parsed.rootNote, transpositionOffset);
                let suffix = '';
                
                // Find the original short-hand suffix for the chord type
                for (const key in CHORD_TYPE_MAP) {
                    if (CHORD_TYPE_MAP[key] === parsed.type) {
                        suffix = key;
                        break;
                    }
                }
                 if (parsed.type === 'Mayor' && suffix === '') {
                    // This handles plain major chords correctly
                 } else if (parsed.type === 'Menor' && suffix === 'm') {
                    // This handles plain minor chords
                 } else if (!suffix) {
                    // Fallback for types that don't have a direct suffix in the map, though this should be rare.
                    // Let's try to build one from the type name if possible.
                    if (parsed.type === 'Mayor') suffix = '';
                    else if (parsed.type === 'Menor') suffix = 'm';
                 }


                if (parsed.bassNote) {
                    const newBass = transposeNote(parsed.bassNote, transpositionOffset);
                    songChord.chord = `${newRoot}${suffix}/${newBass}`;
                } else {
                    songChord.chord = newRoot + suffix;
                }
            }
        });
    });
    
    return transposedSong;
}

export function getNotesForChordString(chordString: string): string[] {
    const parsedChord = parseChordString(chordString);
    if (!parsedChord) {
        return [];
    }
    const { notesToPress, bassNoteIndex } = getChordNotes(parsedChord);

    const allNotes: number[] = [...notesToPress];
    if (bassNoteIndex !== null) {
        allNotes.push(bassNoteIndex);
    }

    // Convert MIDI indices to note names (e.g., 'C4')
    return allNotes.map(midiIndex => {
        const noteName = INDEX_TO_DISPLAY_NAME[midiIndex % 12];
        const octave = Math.floor(midiIndex / 12) - 1; // MIDI 0 is C-1, so C4 is MIDI 60
        return `${noteName}${octave}`;
    }).sort((a, b) => {
        // Sort notes to ensure consistent order (e.g., C4, E4, G4)
        const noteAIndex = NOTE_TO_INDEX[a.slice(0, -1)];
        const octaveA = parseInt(a.slice(-1), 10);
        const noteBIndex = NOTE_TO_INDEX[b.slice(0, -1)];
        const octaveB = parseInt(b.slice(-1), 10);

        if (octaveA !== octaveB) {
            return octaveA - octaveB;
        }
        return noteAIndex - noteBIndex;
    });
}

/**
 * Calcula un rango de piano óptimo para visualizar un conjunto de notas.
 * Asegura un número mínimo de teclas y centra el acorde.
 * @param allNotes - Un array de todos los índices de notas MIDI a considerar para el rango.
 * @param minWhiteKeys - El número mínimo de teclas blancas que deben ser visibles.
 * @param horizontalPaddingSemitones - Un pequeño margen en semitonos a cada lado.
 * @returns Un objeto { startNote, endNote } con el rango de piano óptimo en índices MIDI.
 */
export function calculateOptimalPianoRange(
    allNotes: number[],
    minWhiteKeys: number = 20, // Aprox. 3 octavas de teclas blancas
    horizontalPaddingSemitones: number = 5 // Un padding de 5 semitonos (aprox. 3 teclas blancas)
): { startNote: number; endNote: number } {
    
    if (allNotes.length === 0) {
        return { startNote: 48, endNote: 83 }; // Rango por defecto C3-B5
    }

    const minNote = Math.min(...allNotes);
    const maxNote = Math.max(...allNotes);

    // 1. Calcular el rango inicial ajustado al acorde con un padding.
    let startNote = minNote - horizontalPaddingSemitones;
    let endNote = maxNote + horizontalPaddingSemitones;

    // 2. Calcular el número mínimo de semitonos necesarios para mostrar `minWhiteKeys`.
    const requiredSemitoneSpan = Math.ceil(minWhiteKeys * (12 / 7));
    const currentSemitoneSpan = endNote - startNote;

    // 3. Si el rango actual es más pequeño que el mínimo requerido, expandirlo.
    if (currentSemitoneSpan < requiredSemitoneSpan) {
        // CORRECCIÓN 3: Se eliminó la variable 'deficit' que no se usaba.
        const centerPoint = Math.round((minNote + maxNote) / 2);

        startNote = centerPoint - Math.ceil(requiredSemitoneSpan / 2);
        endNote = centerPoint + Math.floor(requiredSemitoneSpan / 2);
    }
    
    // 4. Asegurar que el rango no se salga de los límites de un piano estándar (A0-C8)
    const PIANO_MIN_MIDI = 21;
    const PIANO_MAX_MIDI = 108;

    return {
        startNote: Math.max(PIANO_MIN_MIDI, Math.round(startNote)),
        endNote: Math.min(PIANO_MAX_MIDI, Math.round(endNote)),
    };
}