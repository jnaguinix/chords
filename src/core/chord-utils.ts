import { NOTE_TO_INDEX, MUSICAL_INTERVALS, INDEX_TO_DISPLAY_NAME, CHORD_TYPE_MAP, CHORD_TYPE_TO_SUFFIX } from '../constants';
import type { SequenceItem, ProcessedSong, SongLine, SongChord } from '../types';

// Un mapa para convertir alteraciones de texto a semitonos.
const ALTERATION_TO_SEMITONES: { [key: string]: number } = {
    'b5': -1, '#5': 1, 'b9': -1, '#9': 1, '#11': 1
};

// Un mapa para saber el intervalo base de las tensiones más comunes.
const DEGREE_TO_INTERVAL: { [key: number]: number } = {
    5: 7,   // La 5ta está a 7 semitonos
    9: 14,  // La 9na está a 14 semitonos (una octava + una 2da mayor)
    11: 17, // La 11va está a 17 semitonos
    13: 21, // La 13va está a 21 semitonos
};


export function getChordNotes(item: SequenceItem, transpositionOffset: number = 0): { notesToPress: number[], bassNoteIndex: number | null, allNotesForRange: number[] } {
    if (!item.rootNote || !item.type) {
        return { notesToPress: [], bassNoteIndex: null, allNotesForRange: [] };
    }
    const transposedRootNote = transposeNote(item.rootNote, transpositionOffset);
    const rootNoteIndex = NOTE_TO_INDEX[transposedRootNote];
    const intervals = MUSICAL_INTERVALS[item.type];
    if (rootNoteIndex === undefined || !intervals) {
        return { notesToPress: [], bassNoteIndex: null, allNotesForRange: [] };
    }

    const chordBaseAbsoluteIndex = rootNoteIndex + 12 * 3; // Octava C3
    const fundamentalChordNotes = intervals.map((interval: number) => chordBaseAbsoluteIndex + interval);
    
    // Lógica de alteraciones mejorada
    if (item.alterations) {
        item.alterations.forEach((alt: string) => {
            const semitoneChange = ALTERATION_TO_SEMITONES[alt];
            if (semitoneChange === undefined) return;

            const degree = parseInt(alt.replace(/[^0-9]/g, ''), 10);
            
            if (degree === 5) {
                const fifthIntervalIndex = intervals.indexOf(7);
                if (fifthIntervalIndex !== -1) {
                    fundamentalChordNotes[fifthIntervalIndex] += semitoneChange;
                }
            } 
            else if (DEGREE_TO_INTERVAL[degree]) {
                const baseInterval = DEGREE_TO_INTERVAL[degree];
                const newNote = chordBaseAbsoluteIndex + baseInterval + semitoneChange;
                fundamentalChordNotes.push(newNote);
            }
        });
    }

    fundamentalChordNotes.sort((a: number, b: number) => a - b);

    let bassAbsoluteIndex: number | null = null;
    const transposedBassNote = item.bassNote ? transposeNote(item.bassNote, transpositionOffset) : transposedRootNote;
    const bassNoteIndexMod12 = NOTE_TO_INDEX[transposedBassNote];

    if (bassNoteIndexMod12 !== undefined) {
        // --- LÓGICA DE BAJO CORREGIDA PARA CONSISTENCIA ---
        const lowestChordNote = Math.min(...fundamentalChordNotes);
        
        // Empezamos calculando el bajo en la misma octava que la nota más grave del acorde.
        let tempBassIndex = bassNoteIndexMod12 + (Math.floor(lowestChordNote / 12)) * 12;

        // Si el bajo no es estrictamente más grave que la nota más grave del acorde,
        // lo bajamos una octava para asegurar que sea la verdadera nota más grave.
        if (tempBassIndex >= lowestChordNote) {
            tempBassIndex -= 12;
        }
        
        bassAbsoluteIndex = tempBassIndex;
    }


    let chordAbsoluteIndices = [...fundamentalChordNotes];
    if (item.inversion && item.inversion > 0) {
        for (let i = 0; i < item.inversion; i++) {
            const lowestNote = chordAbsoluteIndices.shift();
            if (lowestNote !== undefined) {
                chordAbsoluteIndices.push(lowestNote + 12);
            }
            chordAbsoluteIndices.sort((a: number, b: number) => a - b);
        }
    }
    
    const allNotesForRange = [...chordAbsoluteIndices, ...(bassAbsoluteIndex !== null ? [bassAbsoluteIndex] : [])];
    return { 
        notesToPress: chordAbsoluteIndices, 
        bassNoteIndex: bassAbsoluteIndex, 
        allNotesForRange 
    };
}


export function formatChordName(item: SequenceItem, options: { style: 'short' | 'long' }, transpositionOffset: number = 0): string {
    if (!item) return '';

    if (!item.rootNote || !item.type) {
        return item.raw || '';
    }

    const { rootNote, type, bassNote, inversion, alterations } = item;
    const transposedRootNote = transposeNote(rootNote, transpositionOffset);
    const transposedBassNote = bassNote ? transposeNote(bassNote, transpositionOffset) : transposedRootNote;
    
    if (options.style === 'short') {
        const suffix = CHORD_TYPE_TO_SUFFIX[type] ?? '';
        let displayName = transposedRootNote + suffix;

        if (alterations && alterations.length > 0) {
            displayName += `(${alterations.join(',')})`;
        }

        if (bassNote && transposedBassNote !== transposedRootNote) {
            displayName += `/${transposedBassNote}`;
        }
        return displayName;
    }

    if (options.style === 'long') {
        let displayName = `${transposedRootNote} ${type}`;
        if (alterations && alterations.length > 0) {
            displayName += ` con alteraciones ${alterations.join(', ')}`;
        }
        if (bassNote && transposedBassNote !== transposedRootNote) {
            displayName += ` / ${transposedBassNote}`;
        }
        if (inversion && inversion > 0) {
            displayName += ` (${inversion}ª Inv.)`;
        }
        return displayName;
    }

    return ''; 
}

export function parseChordString(chord: string): SequenceItem | null {
    const sanitizedChord = chord.trim();
    if (!sanitizedChord) return null;

    const chordRegex = /^([A-G][#b]?)([^/()]*)(?:\(([^)]+)\))?(?:\/([A-G][#b]?))?/;
    const match = sanitizedChord.match(chordRegex);

    if (!match) return null;

    const [, rootNote, rawSuffix, alterationsStr, bassNote] = match;
    let typeSuffix = rawSuffix.trim();

    if (typeSuffix === 'sus') {
        typeSuffix = 'sus4';
    }

    if (NOTE_TO_INDEX[rootNote] === undefined || (bassNote && NOTE_TO_INDEX[bassNote] === undefined)) {
        return null;
    }

    const alterations = alterationsStr ? alterationsStr.replace(/\s/g, '').split(',') : undefined;

    if (alterations) {
        const combinedSuffix = typeSuffix + alterations.join('');
        if (CHORD_TYPE_MAP[combinedSuffix]) {
            return {
                raw: chord,
                rootNote,
                type: CHORD_TYPE_MAP[combinedSuffix],
                bassNote,
            };
        }
    }

    const sortedSuffixes = Object.keys(CHORD_TYPE_MAP).sort((a, b) => b.length - a.length);
    for (const suffix of sortedSuffixes) {
        if (typeSuffix === suffix) {
            return { 
                raw: chord, 
                rootNote, 
                type: CHORD_TYPE_MAP[suffix], 
                bassNote, 
                alterations
            };
        }
    }
    
    if (typeSuffix === '') {
        return { raw: chord, rootNote, type: 'Mayor', bassNote, alterations };
    }

    return null;
}


export function parseSongText(songText: string): ProcessedSong {
    songText = songText.replace(/\t/g, '    ');
    
    const rawLines = songText.split('\n');
    const processedLines: SongLine[] = [];
    const allChords: SequenceItem[] = [];

    const isChordLine = (line: string): boolean => {
        const cleanLine = line.replace(/[-–|]/g, ' ').trim();
        const tokens = cleanLine.split(/\s+/).filter(Boolean);
        if (tokens.length === 0) return false;
        
        const chordCount = tokens.filter(token => parseChordString(token) !== null).length;
        
        return chordCount > 0 && (chordCount / tokens.length) >= 0.7;
    };

    let i = 0;
    while (i < rawLines.length) {
        const originalLine = rawLines[i];
        let lineToProcess = originalLine;

        lineToProcess = lineToProcess.replace(/([A-G][#b]?[^/\s()]*)\s+(\([^)]+\))/g, '$1$2');
        lineToProcess = lineToProcess.replace(/\s+\/\s+/g, '/');

        const labelRegex = /^(\s*(?:\[[^\]]+\]|[^:]+:)\s*)/;
        const labelMatch = lineToProcess.match(labelRegex);
        let label = '';
        let chordOffset = 0; 

        if (labelMatch) {
            label = labelMatch[0].trim();
            lineToProcess = lineToProcess.substring(labelMatch[0].length);
            chordOffset = labelMatch[0].length;
        }

        if (isChordLine(lineToProcess)) {
            const songChords: SongChord[] = [];
            
            if (label) {
                const annotationItem: SequenceItem = { raw: label, rootNote: '', type: '' };
                songChords.push({ chord: annotationItem, position: 0, isAnnotation: true });
            }

            const cleanChordLine = lineToProcess.replace(/[-–|]/g, ' ');
            const chordRegex = /(\S+)/g;
            let match;
            while ((match = chordRegex.exec(cleanChordLine)) !== null) {
                const chordStr = match[1];
                const parsedChord = parseChordString(chordStr);
                const finalPosition = match.index + chordOffset;

                if (parsedChord) {
                    songChords.push({ chord: parsedChord, position: finalPosition });
                    allChords.push(parsedChord);
                } else {
                    const annotationItem: SequenceItem = { raw: chordStr, rootNote: '', type: '' };
                    songChords.push({ chord: annotationItem, position: finalPosition, isAnnotation: true });
                }
            }

            const nextLine = (i + 1 < rawLines.length) ? rawLines[i + 1] : null;
            
            if (nextLine !== null && !isChordLine(nextLine)) {
                processedLines.push({ lyrics: nextLine, chords: songChords, isInstrumental: false });
                i += 2;
            } else {
                processedLines.push({ lyrics: '', chords: songChords, isInstrumental: true });
                i += 1;
            }
        } else {
            processedLines.push({ lyrics: originalLine, chords: [], isInstrumental: false });
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

export function applyTransposition(songToTranspose: ProcessedSong, transpositionOffset: number): ProcessedSong {
    const updateChord = (chord: SequenceItem) => {
        if (!chord.rootNote) return;
        chord.rootNote = transposeNote(chord.rootNote, transpositionOffset);
        if (chord.bassNote) {
            chord.bassNote = transposeNote(chord.bassNote, transpositionOffset);
        }
    };
    songToTranspose.allChords.forEach(updateChord);
    return songToTranspose;
}

export function calculateOptimalPianoRange(
    allNotes: number[],
    minWhiteKeys: number = 20,
    horizontalPaddingSemitones: number = 5
): { startNote: number; endNote: number } {
    if (allNotes.length === 0) {
        return { startNote: 48, endNote: 83 };
    }
    const minNote = Math.min(...allNotes);
    const maxNote = Math.max(...allNotes);
    let startNote = minNote - horizontalPaddingSemitones;
    let endNote = maxNote + horizontalPaddingSemitones;
    const requiredSemitoneSpan = Math.ceil(minWhiteKeys * (12 / 7));
    const currentSemitoneSpan = endNote - startNote;
    if (currentSemitoneSpan < requiredSemitoneSpan) {
        const centerPoint = Math.round((minNote + maxNote) / 2);
        startNote = centerPoint - Math.ceil(requiredSemitoneSpan / 2);
        endNote = centerPoint + Math.floor(requiredSemitoneSpan / 2);
    }
    const PIANO_MIN_MIDI = 21;
    const PIANO_MAX_MIDI = 108;
    return {
        startNote: Math.max(PIANO_MIN_MIDI, Math.round(startNote)),
        endNote: Math.min(PIANO_MAX_MIDI, Math.round(endNote)),
    };
}
