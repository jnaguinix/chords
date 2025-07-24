import { NOTE_TO_INDEX, MUSICAL_INTERVALS, INDEX_TO_SHARP_NAME, INDEX_TO_FLAT_NAME, CHORD_TYPE_MAP, CHORD_TYPE_TO_SUFFIX } from '../constants';
import type { SequenceItem, ProcessedSong, SongLine, SongChord } from '../types';

// Mapas para convertir texto a su efecto musical
const ALTERATION_MAP: { [key: string]: { degree: number, change: number } } = {
    'b5': { degree: 5, change: -1 }, '#5': { degree: 5, change: 1 },
    'b9': { degree: 9, change: -1 }, '#9': { degree: 9, change: 1 },
    '#11': { degree: 11, change: 1 }, 'b13': { degree: 13, change: -1 }
};
const ADDITION_MAP: { [key: string]: { degree: number } } = {
    'add9': { degree: 9 }, 'add11': { degree: 11 }, 'add13': { degree: 13 }
};
const DEGREE_TO_INTERVAL: { [key: number]: number } = {
    1: 0, 3: 4, 4: 5, 5: 7, 6: 9, 7: 11, 9: 14, 11: 17, 13: 21
};

function transposeNote(note: string, semitones: number): string {
    const currentIndex = NOTE_TO_INDEX[note];
    if (currentIndex === undefined) return note;
    const newIndex = (currentIndex + semitones % 12 + 12) % 12;
    const useFlats = note.includes('b') && note.length > 1;
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
    
    // Aplica las alteraciones (ej. #5, b9)
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

    // Aplica las adiciones (ej. add11)
    if (item.additions) {
        item.additions.forEach((add: string) => {
            const additionInfo = ADDITION_MAP[add];
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
    const sanitizedChord = chord.trim();
    if (!sanitizedChord) return null;

    if (sanitizedChord.startsWith('(') && sanitizedChord.endsWith(')')) {
        return null;
    }

    let bassNote: string | undefined;
    let mainPart = sanitizedChord;

    const bassMatch = sanitizedChord.match(/\/([A-G][#b]?)$/);
    if (bassMatch) {
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

    const modificationRegex = /(#|b)\d+|add\d+/g;
    let match;
    while ((match = modificationRegex.exec(remainingSuffix)) !== null) {
        const mod = match[0];
        if (mod.startsWith('add')) {
            additions.push(mod);
        } else if (Object.keys(ALTERATION_MAP).includes(mod)) {
            alterations.push(mod);
        }
    }

    let finalRemainder = remainingSuffix.replace(modificationRegex, '').trim();
    if (finalRemainder.length > 0) {
        return null;
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
    if (!item) return '';
    if (!item.rootNote || !item.type) return item.raw || '';
    
    if (options.style === 'short') {
        const suffix = CHORD_TYPE_TO_SUFFIX[item.type] ?? '';
        const root = transposeNote(item.rootNote, transpositionOffset);
        const bass = item.bassNote ? transposeNote(item.bassNote, transpositionOffset) : null;
        
        let displayName = root + suffix;
        if (item.alterations) displayName += item.alterations.join('');
        if (item.additions) displayName += item.additions.join('');
        if (bass && bass !== root) displayName += `/${bass}`;
        
        return displayName;
    }

    if (options.style === 'long') {
        let displayName = `${transposeNote(item.rootNote, transpositionOffset)} ${item.type}`;
        if (item.alterations) displayName += ` con alteraciones ${item.alterations.join(', ')}`;
        if (item.additions) displayName += ` con adiciones ${item.additions.join(', ')}`;
        if (item.bassNote && transposeNote(item.bassNote, transpositionOffset) !== transposeNote(item.rootNote, transpositionOffset)) {
            displayName += ` / ${transposeNote(item.bassNote, transpositionOffset)}`;
        }
        if (item.inversion && item.inversion > 0) displayName += ` (${item.inversion}ª Inv.)`;
        return displayName;
    }

    return ''; 
}

export function parseSongText(songText: string): ProcessedSong {
    songText = songText.replace(/\t/g, '    ');
    const rawLines = songText.split('\n');
    const processedLines: SongLine[] = [];
    const allChords: SequenceItem[] = [];

    const isChordLine = (line: string): boolean => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return false;

        if (trimmedLine.match(/^\[[^\]]+\]$/) || trimmedLine.endsWith(':')) {
            return false;
        }
        
        let contentToAnalyze = trimmedLine;
        if (trimmedLine.startsWith('//')) {
            contentToAnalyze = trimmedLine.replace(/^\/\/\s*|\s*\/\/$/g, '').trim();
        }

        if (!contentToAnalyze) return false;

        const tokens = contentToAnalyze.match(/\([^)]+\)|\S+/g) || [];
        if (tokens.length === 0) return false;

        let numChordLikeTokens = 0;
        let numPotentialLyricWords = 0;
        let totalTokensForRatio = 0;

        for (const token of tokens) {
            const isParenthesized = token.startsWith('(') && token.endsWith(')');
            const innerContent = isParenthesized ? token.slice(1, -1) : token;
            const subTokens = innerContent.split(/[-–|]/g).filter(Boolean);
            
            totalTokensForRatio += subTokens.length;

            for (const subToken of subTokens) {
                if (parseChordString(subToken) !== null) {
                    numChordLikeTokens++;
                } else {
                    const isMusicalAnnotation = isParenthesized || subToken.toLowerCase() === 'n.c.' || subToken.toLowerCase() === 'x';
                    if (!isMusicalAnnotation) {
                        numPotentialLyricWords++;
                    }
                }
            }
        }

        if (numPotentialLyricWords > 0) {
            return false;
        }

        return totalTokensForRatio > 0 && (numChordLikeTokens / totalTokensForRatio) >= 0.5;
    };

    let i = 0;
    while (i < rawLines.length) {
        const currentRawLine = rawLines[i];
        let currentLineChords: SongChord[] = [];
        let currentLineLyrics = '';
        let isInstrumental = false;
        
        let lineToParseForChords = currentRawLine;
        let label = '';
        let chordOffset = 0;

        const labelRegex = /^(\s*(?:\u005b[^\]]+\u005d|[^:]+:\s*))/;
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
            
            const chordRegex = /\([^)]+\)|\S+/g;
            let match;
            while ((match = chordRegex.exec(lineToParseForChords)) !== null) {
                if (match[0].trim() === '') continue;

                const token = match[0];
                const position = match.index + chordOffset;
                const isParenthesized = token.startsWith('(') && token.endsWith(')');
                
                // *** LA SOLUCIÓN DEFINITIVA Y JERÁRQUICA ESTÁ AQUÍ ***
                const contentToParse = isParenthesized ? token.slice(1, -1) : token;
                const basePosition = isParenthesized ? position + 1 : position;
                
                const subTokens = contentToParse.split(/([-–|])/);
                let currentSubPosition = basePosition;
                let foundChordsInGroup = false;

                for (const subToken of subTokens) {
                    if (subToken.trim() === '' || subToken.match(/[-–|]/)) {
                        currentSubPosition += subToken.length;
                        continue;
                    }

                    const parsedChord = parseChordString(subToken);
                    if (parsedChord) {
                        foundChordsInGroup = true;
                        currentLineChords.push({ chord: parsedChord, position: currentSubPosition });
                        allChords.push(parsedChord);
                    }
                    currentSubPosition += subToken.length;
                }
                
                // Si el grupo entre paréntesis no contenía acordes válidos, trátalo como una sola anotación.
                if (isParenthesized && !foundChordsInGroup) {
                    const annotationItem = { raw: token, rootNote: '', type: '' };
                    currentLineChords.push({ chord: annotationItem, position: position, isAnnotation: true });
                } else if (!isParenthesized && !foundChordsInGroup) {
                    const annotationItem = { raw: token, rootNote: '', type: '' };
                    currentLineChords.push({ chord: annotationItem, position: position, isAnnotation: true });
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
    const updateChord = (chord: SequenceItem) => {
        if (chord.rootNote) {
            chord.rootNote = transposeNote(chord.rootNote, transpositionOffset);
        }
        if (chord.bassNote) {
            chord.bassNote = transposeNote(chord.bassNote, transpositionOffset);
        }
    };
    songToTranspose.allChords.forEach(updateChord);
    songToTranspose.lines.forEach(line => {
        line.chords.forEach(songChord => {
            if (!songChord.isAnnotation) {
                updateChord(songChord.chord);
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