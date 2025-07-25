/*
================================================================================
|                              chord-utils.ts                                  |
|         (Versión final con formateo de nombres largos)                       |
================================================================================
*/

import { 
    NOTE_TO_INDEX, 
    MUSICAL_INTERVALS, 
    INDEX_TO_SHARP_NAME, 
    INDEX_TO_FLAT_NAME, 
    CHORD_TYPE_MAP, 
    CHORD_DISPLAY_LIST,
    NOTE_NAME_SPANISH,          // ANOTACIÓN: Importamos el nuevo diccionario de notas
    CHORD_TYPE_TO_READABLE_NAME // ANOTACIÓN: Importamos el nuevo diccionario de tipos de acorde
} from './constants';
import type { SequenceItem, ProcessedSong, SongLine, SongChord } from '../types';

// El resto de las constantes y funciones de bajo nivel no necesitan cambios.
const ALTERATION_MAP: { [key: string]: { degree: number, change: number } } = {
    'b5': { degree: 5, change: -1 }, '#5': { degree: 5, change: 1 },
    'b9': { degree: 9, change: -1 }, '#9': { degree: 9, change: 1 },
    '#11': { degree: 11, change: 1 }, 'b13': { degree: 13, change: -1 }
};
const ADDITION_MAP: { [key: string]: { degree: number } } = {
    'add(9)': { degree: 9 }, 'add(11)': { degree: 11 }
};
const DEGREE_TO_INTERVAL: { [key: number]: number } = {
    1: 0, 3: 4, 4: 5, 5: 7, 6: 9, 7: 11, 9: 14, 11: 17, 13: 21
};

export function transposeNote(note: string, semitones: number): string {
    const currentIndex = NOTE_TO_INDEX[note];
    if (currentIndex === undefined) return note;
    const newIndex = (currentIndex + semitones % 12 + 12) % 12;
    const useFlats = (note.includes('b') && note.length > 1) || ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb'].includes(note);
    return useFlats ? INDEX_TO_FLAT_NAME[newIndex] : INDEX_TO_SHARP_NAME[newIndex];
}

export function getChordNotes(item: SequenceItem, transpositionOffset: number = 0): { notesToPress: number[], bassNoteIndex: number | null, allNotesForRange: number[] } {
    if (!item.rootNote || !item.type) {
        return { notesToPress: [], bassNoteIndex: null, allNotesForRange: [] };
    }
    const transposedRootNote = transposeNote(item.rootNote, transpositionOffset);
    const rootNoteIndex = NOTE_TO_INDEX[transposedRootNote];
    const baseIntervals = MUSICAL_INTERVALS[item.type];
    if (rootNoteIndex === undefined || !baseIntervals) {
        return { notesToPress: [], bassNoteIndex: null, allNotesForRange: [] };
    }
    const chordBaseAbsoluteIndex = rootNoteIndex + 12 * 3;
    let fundamentalChordNotes = baseIntervals.map((interval: number) => chordBaseAbsoluteIndex + interval);
    if (item.alterations) {
        item.alterations.forEach((alt: string) => {
            const alterationInfo = ALTERATION_MAP[alt];
            if (!alterationInfo) return;
            const baseInterval = DEGREE_TO_INTERVAL[alterationInfo.degree];
            let noteToAlterIndex = fundamentalChordNotes.findIndex(note => (note - chordBaseAbsoluteIndex) % 12 === baseInterval % 12);
            if (noteToAlterIndex !== -1) {
                fundamentalChordNotes[noteToAlterIndex] += alterationInfo.change;
            } else {
                fundamentalChordNotes.push(chordBaseAbsoluteIndex + baseInterval + alterationInfo.change);
            }
        });
    }
    if (item.additions) {
        item.additions.forEach((add: any) => {
            const additionInfo = ADDITION_MAP[add as keyof typeof ADDITION_MAP];
            if (!additionInfo) return;
            const intervalToAdd = DEGREE_TO_INTERVAL[additionInfo.degree];
            fundamentalChordNotes.push(chordBaseAbsoluteIndex + intervalToAdd);
        });
    }
    fundamentalChordNotes = [...new Set(fundamentalChordNotes)].sort((a, b) => a - b);
    let bassAbsoluteIndex: number | null = null;
    const transposedBassNote = item.bassNote ? transposeNote(item.bassNote, transpositionOffset) : transposedRootNote;
    const bassNoteIndexMod12 = NOTE_TO_INDEX[transposedBassNote];
    if (bassNoteIndexMod12 !== undefined) {
        const lowestChordNote = Math.min(...fundamentalChordNotes);
        let tempBassIndex = bassNoteIndexMod12 + (Math.floor(lowestChordNote / 12)) * 12;
        if (tempBassIndex >= lowestChordNote) tempBassIndex -= 12;
        bassAbsoluteIndex = tempBassIndex;
    }
    let chordAbsoluteIndices = [...fundamentalChordNotes];
    if (item.inversion && item.inversion > 0) {
        for (let i = 0; i < item.inversion; i++) {
            const lowestNote = chordAbsoluteIndices.shift();
            if (lowestNote !== undefined) chordAbsoluteIndices.push(lowestNote + 12);
            chordAbsoluteIndices.sort((a, b) => a - b);
        }
    }
    const allNotesForRange = [...new Set([...chordAbsoluteIndices, ...(bassAbsoluteIndex !== null ? [bassAbsoluteIndex] : [])])];
    return { notesToPress: chordAbsoluteIndices, bassNoteIndex: bassAbsoluteIndex, allNotesForRange };
}

export function parseChordString(chord: string): SequenceItem | null {
    let sanitizedChord = chord.trim();
    if (!sanitizedChord || sanitizedChord === '%' || sanitizedChord === '|') return null;
    if (sanitizedChord.startsWith('(') && sanitizedChord.endsWith(')')) return null;

    let bassNote: string | undefined;
    let mainPart = sanitizedChord;

    const bassMatch = sanitizedChord.match(/\/([A-G][#b]?)$/);
    if (bassMatch && bassMatch[0]) {
        bassNote = bassMatch[1];
        mainPart = sanitizedChord.substring(0, sanitizedChord.length - bassMatch[0].length);
    }
    
    const rootMatch = mainPart.match(/^[A-G][#b]?/);
    if (!rootMatch) return null;
    const rootNote = rootMatch[0];
    
    let suffix = mainPart.substring(rootNote.length).trim();
    
    if (NOTE_TO_INDEX[rootNote] === undefined || (bassNote && NOTE_TO_INDEX[bassNote] === undefined)) {
        return null;
    }
    
    const cleanSuffix = suffix.replace(/[()]/g, '');
    const sortedSuffixes = Object.keys(CHORD_TYPE_MAP).sort((a, b) => b.length - a.length);
    let foundType: string | null = null;
    let foundSuffix = '';
    
    for (const mapSuffix of sortedSuffixes) {
        if (cleanSuffix.startsWith(mapSuffix)) {
            foundType = CHORD_TYPE_MAP[mapSuffix];
            foundSuffix = mapSuffix;
            break;
        }
    }

    if (!foundType) return null;

    let remainingSuffix = cleanSuffix.substring(foundSuffix.length);
    const alterations: string[] = [];
    const additions: string[] = [];
    
    const modificationRegex = /([#b-])(\d+)|(add\d+)/g;
    let match;
    while ((match = modificationRegex.exec(remainingSuffix)) !== null) {
        const mod = match[0];
        
        if (mod.startsWith('add')) {
            const addKey = mod === 'add11' || mod === 'add4' ? 'add(11)' : 'add(9)';
            additions.push(addKey);
        } else {
            const symbol = match[1] === '-' ? 'b' : match[1];
            const number = match[2];
            alterations.push(`${symbol}${number}`);
        }
    }

    return { 
        raw: chord, 
        rootNote, 
        type: foundType, 
        bassNote, 
        alterations: alterations.length > 0 ? alterations : undefined,
        additions: additions.length > 0 ? additions : undefined
    };
}


export function formatChordName(item: SequenceItem, options: { style: 'short' | 'long' }, transpositionOffset: number = 0): string {
    if (!item || !item.rootNote || !item.type) return item?.raw || '';
    if (item.raw === '%' || item.raw === '|') return item.raw;
    
    const root = transposeNote(item.rootNote, transpositionOffset);
    const bass = item.bassNote ? transposeNote(item.bassNote, transpositionOffset) : null;

    if (options.style === 'short') {
        const displayInfo = CHORD_DISPLAY_LIST.find(d => d.value === item.type);
        const suffix = displayInfo ? (displayInfo.text === 'Mayor' ? '' : displayInfo.text) : '';
        
        let alterationsString = '';
        const allMods = [...(item.alterations || []), ...(item.additions || [])];
        if (allMods.length > 0) {
            const sortedMods = allMods.sort((a, b) => parseInt(a.replace(/[^0-9]/g, ''), 10) - parseInt(b.replace(/[^0-9]/g, ''), 10));
            alterationsString = `(${sortedMods.join('')})`;
        }

        let displayName = root + suffix + alterationsString;
        if (bass && bass !== root) {
            displayName += `/${bass}`;
        }
        
        return displayName;
    }

    if (options.style === 'long') {
        // ANOTACIÓN: ¡AQUÍ ESTÁ LA MAGIA!
        // Esta sección ha sido completamente reescrita para usar los nuevos diccionarios.

        const rootNoteName = NOTE_NAME_SPANISH[root] || root;
        const chordTypeName = CHORD_TYPE_TO_READABLE_NAME[item.type] || item.type;
        
        let displayName = `${rootNoteName} ${chordTypeName}`;

        // La lógica para añadir alteraciones, bajo e inversiones se mantiene igual
        // porque ya es descriptiva y funciona bien.
        if (item.alterations && item.alterations.length > 0) {
            displayName += ` con alteraciones (${item.alterations.join(', ')})`;
        }
        if (bass && bass !== root) {
            const bassNoteName = NOTE_NAME_SPANISH[bass] || bass;
            displayName += ` con bajo en ${bassNoteName}`;
        }
        if (item.inversion && item.inversion > 0) {
            displayName += ` (${item.inversion}ª Inversión)`;
        }
        return displayName;
    }

    return ''; 
}

// El resto de las funciones no necesitan cambios.
export function parseSongText(songText: string): ProcessedSong {
    songText = songText.replace(/\t/g, '    ');
    const rawLines = songText.split('\n');
    const processedLines: SongLine[] = [];
    const allChords: SequenceItem[] = [];

    const isChordLine = (line: string): boolean => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return false;
        if (trimmedLine.match(/^\\[[^\]]+\\]$/) || trimmedLine.endsWith(':')) {
            return false;
        }
        let contentToAnalyze = trimmedLine;
        if (trimmedLine.startsWith('//')) {
            contentToAnalyze = trimmedLine.replace(/^\/\/\s*|\s*\/\/$/g, '').trim();
        }
        if (!contentToAnalyze) return false;
        const tokens = contentToAnalyze.match(/\([^)]+\)|\||\S+/g) || [];
        if (tokens.length === 0) return false;
        let numChordLikeTokens = 0;
        let numPotentialLyricWords = 0;
        for (const token of tokens) {
            if (token === '%' || token === '|') {
                numChordLikeTokens++;
                continue;
            }
            if (parseChordString(token) !== null) {
                numChordLikeTokens++;
                continue;
            }
            const subTokens = token.split(/(-)/).filter(t => t !== '-' && t.trim() !== '');
            if (subTokens.length <= 1) {
                const isMusicalAnnotation = token.toLowerCase() === 'n.c.' || token.toLowerCase() === 'x' || (token.startsWith('(') && token.endsWith(')'));
                if (!isMusicalAnnotation) numPotentialLyricWords++;
                continue;
            }
            let allSubTokensAreChords = true;
            for (const subToken of subTokens) {
                if (parseChordString(subToken) === null) {
                    allSubTokensAreChords = false;
                    break;
                }
            }
            if (allSubTokensAreChords) {
                numChordLikeTokens += subTokens.length;
            } else {
                numPotentialLyricWords++;
            }
        }
        if (numPotentialLyricWords > 0) return false;
        return tokens.length > 0;
    };

    let i = 0;
    while (i < rawLines.length) {
        const currentRawLine = rawLines[i];
        let currentLineChords: SongChord[] = [];
        let currentLineLyrics = '';
        let isInstrumental = false;
        let lastParsedChord: SequenceItem | null = null;
        let lineToParseForChords = currentRawLine;
        let label = '';
        let chordOffset = 0;
        const labelRegex = /^(?:\s*(?:\u005b[^\]]+\u005d|[^:]+:\s*))/;
        const labelMatch = lineToParseForChords.match(labelRegex);
        if (labelMatch) {
            label = labelMatch[0].trim();
            lineToParseForChords = lineToParseForChords.substring(labelMatch[0].length);
            chordOffset = labelMatch[0].length;
        }
        if (isChordLine(lineToParseForChords)) {
            if (label) {
                const annotationItem: SequenceItem = { raw: label, rootNote: '', type: '' };
                currentLineChords.push({ chord: annotationItem, position: 0, isAnnotation: true });
            }
            const chordRegex = /\([^)]+\)|\||\S+/g;
            let match;
            while ((match = chordRegex.exec(lineToParseForChords)) !== null) {
                if (match[0].trim() === '') continue;
                const token = match[0];
                const position = match.index + chordOffset;
                const processToken = (subToken: string, subPosition: number) => {
                    if (subToken === '%' || subToken === '|') {
                        const symbolItem: SequenceItem = { raw: subToken, rootNote: '', type: '' };
                        if (subToken === '%' && lastParsedChord) {
                            Object.assign(symbolItem, lastParsedChord, { raw: '%' });
                        }
                        currentLineChords.push({ chord: symbolItem, position: subPosition, isAnnotation: (subToken === '|') });
                        return;
                    }
                    const parsedChord = parseChordString(subToken);
                    if (parsedChord) {
                        currentLineChords.push({ chord: parsedChord, position: subPosition });
                        allChords.push(parsedChord);
                        lastParsedChord = parsedChord;
                        return true;
                    }
                    return false;
                };
                const parsedFullToken = processToken(token, position);
                if (!parsedFullToken) {
                    const subTokens = token.split(/(-)/);
                    let currentPosition = position;
                    let foundChordsInGroup = false;
                    for (const subToken of subTokens) {
                        if (subToken.trim() === '' || subToken === '-') {
                            currentPosition += subToken.length;
                            continue;
                        }
                        if (processToken(subToken, currentPosition)) {
                            foundChordsInGroup = true;
                        }
                        currentPosition += subToken.length;
                    }
                    if (!foundChordsInGroup) {
                         const annotationItem = { raw: token, rootNote: '', type: '' };
                         currentLineChords.push({ chord: annotationItem, position: position, isAnnotation: true });
                    }
                }
            }
            const nextLineIndex = i + 1;
            const nextRawLine = (nextLineIndex < rawLines.length) ? rawLines[nextLineIndex] : null;
            if (nextRawLine !== null && !isChordLine(nextRawLine)) {
                currentLineLyrics = nextRawLine;
                i += 2; 
            } else {
                isInstrumental = true;
                i += 1;
            }
        } else {
            currentLineLyrics = currentRawLine;
            i += 1;
        }
        processedLines.push({ lyrics: currentLineLyrics, chords: currentLineChords, isInstrumental: isInstrumental });
    }
    return { lines: processedLines, allChords };
}

export function applyTransposition(songToTranspose: ProcessedSong, transpositionOffset: number): ProcessedSong {
    const chordsMap = new Map<number, SequenceItem>();
    songToTranspose.allChords.forEach(c => c.id !== undefined && chordsMap.set(c.id, c));
    chordsMap.forEach(chord => {
        if (chord.rootNote) {
            chord.rootNote = transposeNote(chord.rootNote, transpositionOffset);
        }
        if (chord.bassNote) {
            chord.bassNote = transposeNote(chord.bassNote, transpositionOffset);
        }
    });
    songToTranspose.lines.forEach(line => {
        line.chords.forEach(songChord => {
            if (songChord.chord.id !== undefined && !songChord.isAnnotation && songChord.chord.raw !== '%') {
                 const transposedChord = chordsMap.get(songChord.chord.id);
                 if (transposedChord) {
                     songChord.chord = transposedChord;
                 }
            }
        });
    });
    return songToTranspose;
}

export function calculateOptimalPianoRange(allNotes: number[], minWhiteKeys: number = 20, horizontalPaddingSemitones: number = 5): { startNote: number; endNote: number } {
    if (allNotes.length === 0) return { startNote: 48, endNote: 83 };
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
