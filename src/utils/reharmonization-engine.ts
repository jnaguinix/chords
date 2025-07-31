/*
================================================================================
|                     src/utils/reharmonization-engine.ts                      |
|                El Cerebro Musical - Motor de Rearmonización                  |
|                   (Versión con Análisis Armónico Avanzado)                   |
================================================================================
*/

import type { SequenceItem, DetectedKey, ChordSuggestion, ReharmonizationSettings, ChordAnalysis, ProcessedSong } from '../types';
import { NOTE_TO_INDEX, INDEX_TO_SHARP_NAME, MUSICAL_INTERVALS } from './constants';
import { transposeNote, parseChordString, formatChordName, getChordNotes } from './chord-utils';

// --- El Analizador de Contexto ---

const MAJOR_SCALE_INTERVALS = [0, 2, 4, 5, 7, 9, 11];
const MINOR_SCALE_INTERVALS = [0, 2, 3, 5, 7, 8, 10];

const MAJOR_SCALE_DEGREES = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
const MINOR_SCALE_DEGREES = ['i', 'ii°', 'bIII', 'iv', 'v', 'bVI', 'bVII'];

// ========================================================================
// REFINAMIENTO PRINCIPAL: La función `analyzeChordContext` ahora es mucho más inteligente.
// ========================================================================
function analyzeChordContext(chord: SequenceItem, detectedKey: DetectedKey): ChordAnalysis | null {
    if (!chord || !chord.rootNote) return null;
    const rootIndex = NOTE_TO_INDEX[chord.rootNote];
    if (rootIndex === undefined) return null;

    const keyRootIndex = NOTE_TO_INDEX[detectedKey.key];
    const interval = (rootIndex - keyRootIndex + 12) % 12;

    let degreeInfo: { degree: string, roman: string } | null = null;
    const isMajorKey = detectedKey.scale === 'Major';

    const getFunction = (roman: string): 'Tonic' | 'Subdominant' | 'Dominant' | 'Transition' => {
        if (['I', 'vi', 'i', 'bIII', 'bVI'].includes(roman)) return 'Tonic';
        if (['IV', 'ii', 'iv', 'ii°'].includes(roman)) return 'Subdominant';
        if (['V', 'vii°', 'v'].includes(roman)) return 'Dominant';
        return 'Transition';
    };

    // Paso 1: Búsqueda de Grado Diatónico (el caso más común)
    const scaleIntervals = isMajorKey ? MAJOR_SCALE_INTERVALS : MINOR_SCALE_INTERVALS;
    const scaleDegrees = isMajorKey ? MAJOR_SCALE_DEGREES : MINOR_SCALE_DEGREES;
    const degreeIndex = scaleIntervals.indexOf(interval);

    if (degreeIndex !== -1) {
        degreeInfo = { degree: (degreeIndex + 1).toString(), roman: scaleDegrees[degreeIndex] };
    } else {
        // Si no es diatónico, empieza la búsqueda avanzada.
        // Paso 2: Búsqueda de Acordes de Intercambio Modal (si estamos en tonalidad Mayor)
        if (isMajorKey) {
            const modalInterchangeMap: { [interval: number]: { roman: string, type?: string } } = {
                3: { roman: 'bIIImaj7' }, // ej. Ebmaj7 en C Mayor
                5: { roman: 'iv', type: 'Menor' }, // ej. Fm o Fm7 en C Mayor
                8: { roman: 'bVImaj7' }, // ej. Abmaj7 en C Mayor
                10: { roman: 'bVII7', type: '7 (Dominante)' } // ej. Bb7 en C Mayor
            };
            const foundInterchange = modalInterchangeMap[interval];
            if (foundInterchange) {
                // Verificamos que el tipo de acorde coincida para mayor precisión
                if (!foundInterchange.type || chord.type.startsWith(foundInterchange.type)) {
                    degreeInfo = { degree: foundInterchange.roman, roman: foundInterchange.roman };
                }
            }
        }

        // Paso 3: Búsqueda de Dominantes Secundarios (si aún no se ha encontrado)
        if (!degreeInfo && chord.type === '7 (Dominante)') {
            for (let i = 0; i < scaleIntervals.length; i++) {
                const diatonicRoot = (keyRootIndex + scaleIntervals[i]) % 12;
                const dominantOfDiatonic = (diatonicRoot + 7) % 12;
                if (rootIndex === dominantOfDiatonic) {
                    degreeInfo = { degree: `V7/${scaleDegrees[i]}`, roman: `V7/${scaleDegrees[i]}` };
                    break;
                }
            }
        }
    }

    if (degreeInfo) {
        return {
            ...chord,
            analysis: {
                degree: degreeInfo.degree,
                roman: degreeInfo.roman,
                func: getFunction(degreeInfo.roman),
            }
        };
    }
    
    // Si después de todas las búsquedas no se encuentra, se marca como no analizado.
    return { ...chord, analysis: null };
}

class IntelliHarmonixEngine {
    
    private chordHasInterval(chord: SequenceItem, intervalInSemitones: number): boolean {
        const intervals = MUSICAL_INTERVALS[chord.type];
        if (!intervals) return false;
        return intervals.includes(intervalInSemitones);
    }

    private getDiatonicSubstitutions(chord: ChordAnalysis, key: DetectedKey): ChordSuggestion[] {
        if (!chord.analysis) return [];
        const suggestions: ChordSuggestion[] = [];
        const { func, roman } = chord.analysis;

        const addSuggestion = (targetRoman: string, type: string, justification: string, bassNote?: string) => {
            const isMajorScale = key.scale === 'Major';
            const scaleDegrees = isMajorScale ? MAJOR_SCALE_DEGREES : MINOR_SCALE_DEGREES;
            const scaleIntervals = isMajorScale ? MAJOR_SCALE_INTERVALS : MINOR_SCALE_INTERVALS;
            
            const degreeIndex = scaleDegrees.indexOf(targetRoman);
            if (degreeIndex === -1) return;
            
            const rootNote = transposeNote(key.key, scaleIntervals[degreeIndex]);
            let chordString = `${rootNote}${type}`;
            if (bassNote) chordString += `/${bassNote}`;
            
            const newChord = parseChordString(chordString);
            if (newChord && formatChordName(newChord, {style: 'short'}) !== formatChordName(chord, {style: 'short'})) {
                suggestions.push({ chord: newChord, technique: 'Sustitución Diatónica', justification });
            }
        };

        if (func === 'Tonic' && key.scale === 'Major') {
            if (roman === 'I') {
                const third = transposeNote(chord.rootNote, 4);
                addSuggestion('I', 'maj7', '1ra Inversión (Bajo melódico)', third);
            }
            if (roman !== 'iii') addSuggestion('iii', 'm7', 'Sustituto de tónica (relativo)');
            if (roman !== 'vi') addSuggestion('vi', 'm7', 'Sustituto de tónica (relativo)');
        }
        if (func === 'Subdominant' && key.scale === 'Major') {
            if (roman !== 'ii') addSuggestion('ii', 'm7', 'Sustituto de subdominante (relativo)');
        }
        if (func === 'Dominant' && key.scale === 'Major' && roman === 'V') {
             const third = transposeNote(chord.rootNote, 4);
             addSuggestion('V', '7', '1ra Inversión (conduce al I)', third);
        }

        return suggestions;
    }

    private getSecondaryDominants(nextChord: ChordAnalysis): ChordSuggestion[] {
        if (!nextChord.analysis || ['I', 'i', 'vii°'].includes(nextChord.analysis.roman)) return [];
        
        const targetRootIndex = NOTE_TO_INDEX[nextChord.rootNote];
        if (targetRootIndex === undefined) return [];

        const dominantRoot = transposeNote(INDEX_TO_SHARP_NAME[targetRootIndex], 7);
        const dominantChord = parseChordString(`${dominantRoot}7`);

        if (dominantChord) {
            return [{
                chord: dominantChord,
                technique: 'Dominante Secundario',
                justification: `Prepara el acorde ${formatChordName(nextChord, { style: 'short' })}`
            }];
        }
        return [];
    }

    private getTritoneSubstitution(chord: ChordAnalysis): ChordSuggestion[] {
        if (!this.chordHasInterval(chord, 10)) return [];

        const tritoneRoot = transposeNote(chord.rootNote, 6);
        const tritoneChord = parseChordString(`${tritoneRoot}7`);

        if (tritoneChord) {
            return [{
                chord: tritoneChord,
                technique: 'Sustitución de Tritono',
                justification: `Crea una línea de bajo cromática.`
            }];
        }
        return [];
    }
    
    private getModalInterchange(chord: ChordAnalysis, key: DetectedKey): ChordSuggestion[] {
        if (!chord.analysis || key.scale !== 'Major') return [];
        const suggestions: ChordSuggestion[] = [];
        const { roman } = chord.analysis;
        const keyRoot = key.key;

        if (roman === 'IV') {
            const minorSubdominantRoot = transposeNote(keyRoot, 5);
            const newChord = parseChordString(`${minorSubdominantRoot}m7`);
            if (newChord) {
                suggestions.push({
                    chord: newChord,
                    technique: 'Intercambio Modal',
                    justification: 'Acorde "prestado" de la tonalidad menor (ivm7).'
                });
            }
        }

        if (roman === 'V') {
            const backdoorRoot = transposeNote(keyRoot, 10);
            const newChord = parseChordString(`${backdoorRoot}7`);
            if (newChord) {
                suggestions.push({
                    chord: newChord,
                    technique: 'Intercambio Modal',
                    justification: 'Dominante "Backdoor" (bVII7), resolución suave al I.'
                });
            }
            const flatSixRoot = transposeNote(keyRoot, 8);
            const flatSixChord = parseChordString(`${flatSixRoot}maj7`);
            if (flatSixChord) {
                suggestions.push({
                    chord: flatSixChord,
                    technique: 'Intercambio Modal',
                    justification: 'Resolución deceptiva (bVImaj7), sonido sofisticado.'
                });
            }
        }
        return suggestions;
    }


    private getStyledVoicings(chord: ChordAnalysis): ChordSuggestion[] {
        if (!chord.analysis) return [];
        const suggestions: ChordSuggestion[] = [];

        if (chord.type === 'Mayor' && !this.chordHasInterval(chord, 11)) {
            const newChord = parseChordString(`${chord.rootNote}maj7`);
            if (newChord) {
                suggestions.push({
                    chord: newChord,
                    technique: 'Coloración (Jazz/Soul)',
                    justification: 'Añade una 7ma mayor para un sonido más rico.'
                });
            }
        }

        if (chord.type === 'Menor' && !this.chordHasInterval(chord, 10)) {
            const newChord = parseChordString(`${chord.rootNote}m7`);
            if (newChord) {
                suggestions.push({
                    chord: newChord,
                    technique: 'Coloración (Jazz/Soul)',
                    justification: 'Añade una 7ma menor, un estándar del estilo.'
                });
            }
        }
        
        return suggestions;
    }

    private addExtensions(chord: ChordAnalysis, key: DetectedKey): ChordSuggestion[] {
        const suggestions: ChordSuggestion[] = [];
        const { notesToPress } = getChordNotes(chord);
        if (notesToPress.length === 0) return [];

        const rootMidi = NOTE_TO_INDEX[chord.rootNote];
        if (rootMidi === undefined) return [];
        
        const intervals = new Set(notesToPress.map(note => (note - rootMidi + 12) % 12));

        if (intervals.has(11)) {
            const newChord = parseChordString(`${chord.rootNote}maj9`);
            if (newChord) {
                suggestions.push({
                    chord: newChord,
                    technique: 'Extensión de Acorde',
                    justification: 'Añade la 9na para un sonido más sofisticado (maj9).'
                });
            }
        }

        if (intervals.has(10)) {
            if (chord.analysis?.roman === 'iii' && key.scale === 'Major') {
                const newChord = parseChordString(`${chord.rootNote}m7b9`);
                if (newChord) {
                    suggestions.push({
                        chord: newChord,
                        technique: 'Extensión de Acorde',
                        justification: 'Añade la 9na menor (b9) apropiada para el iii grado.'
                    });
                }
            } else {
                const newChord = parseChordString(`${chord.rootNote}m9`);
                if (newChord) {
                    suggestions.push({
                        chord: newChord,
                        technique: 'Extensión de Acorde',
                        justification: 'Añade la 9na para un color Neo-Soul/Jazz (m9).'
                    });
                }
            }
        }
        return suggestions;
    }


    public getSuggestionsForChord(chordItem: SequenceItem, key: DetectedKey): ChordSuggestion[] {
        const analyzedChord = analyzeChordContext(chordItem, key);
        if (!analyzedChord) return [];

        let allSuggestions: ChordSuggestion[] = [];

        allSuggestions.push(...this.getDiatonicSubstitutions(analyzedChord, key));
        allSuggestions.push(...this.getTritoneSubstitution(analyzedChord));
        allSuggestions.push(...this.getStyledVoicings(analyzedChord));
        allSuggestions.push(...this.addExtensions(analyzedChord, key));
        allSuggestions.push(...this.getModalInterchange(analyzedChord, key));

        const uniqueSuggestions = allSuggestions.filter((suggestion, index, self) =>
            index === self.findIndex((s) => (
                formatChordName(s.chord, { style: 'short' }) === formatChordName(suggestion.chord, { style: 'short' })
            ))
        );

        return uniqueSuggestions;
    }

    public getPassingChordSuggestions(prevChordItem: SequenceItem, nextChordItem: SequenceItem, key: DetectedKey): ChordSuggestion[] {
        const prevChord = analyzeChordContext(prevChordItem, key);
        const nextChord = analyzeChordContext(nextChordItem, key);

        if (!prevChord || !nextChord || !nextChord.analysis) return [];
        let suggestions: ChordSuggestion[] = [];
        const prevRootIndex = NOTE_TO_INDEX[prevChord.rootNote];
        const nextRootIndex = NOTE_TO_INDEX[nextChord.rootNote];

        suggestions.push(...this.getSecondaryDominants(nextChord));

        if (prevRootIndex !== undefined && nextRootIndex !== undefined) {
            if ((prevRootIndex + 2) % 12 === nextRootIndex) {
                const passingRoot = transposeNote(prevChord.rootNote, 1);
                const passingChord = parseChordString(`${passingRoot}dim7`);
                if (passingChord) {
                    suggestions.push({
                        chord: passingChord,
                        technique: 'Acorde de Paso Disminuido',
                        justification: 'Conexión cromática suave.'
                    });
                }
            }
        }
        
        if (prevChord.analysis?.roman === 'I' && nextChord.analysis.roman === 'vi') {
            const thirdOfPrev = transposeNote(prevChord.rootNote, 4);
            const passingChord = parseChordString(`${prevChord.rootNote}/${thirdOfPrev}`);
            if (passingChord) {
                suggestions.push({
                    chord: passingChord,
                    technique: 'Bajo de Paso por Inversión',
                    justification: `Usa I en 1ra inversión (${formatChordName(passingChord, {style: 'short'})}) para un bajo melódico.`
                });
            }
             const dominantOfPrev = transposeNote(prevChord.rootNote, 7);
             const thirdOfDominant = transposeNote(dominantOfPrev, 4);
             const passingChordV7 = parseChordString(`${dominantOfPrev}7/${thirdOfDominant}`);
             if (passingChordV7) {
                 suggestions.push({
                     chord: passingChordV7,
                     technique: 'Bajo de Paso Cromático',
                     justification: `Usa el V7 en 1ra inversión (${formatChordName(passingChordV7, {style: 'short'})}) para conectar.`
                 });
             }
        }
        
        if (!['I', 'i', 'vii°'].includes(nextChord.analysis.roman)) {
            const targetRoot = nextChord.rootNote;
            const relatedTwoRoot = transposeNote(targetRoot, 2);
            const targetIsMajorOrDominant = nextChord.type.includes('Mayor') || nextChord.type.includes('Dominante');
            const relatedTwoType = targetIsMajorOrDominant ? 'm7' : 'm7b5';
            const relatedTwoChord = parseChordString(`${relatedTwoRoot}${relatedTwoType}`);
            if (relatedTwoChord) {
                 suggestions.push({
                    chord: relatedTwoChord,
                    technique: 'II-V Relacionado (el II)',
                    justification: `Inicia el II-V que resuelve a ${formatChordName(nextChord, { style: 'short' })}.`
                });
            }
        }

        return suggestions.filter((suggestion, index, self) =>
            index === self.findIndex((s) => (
                formatChordName(s.chord, { style: 'short' }) === formatChordName(suggestion.chord, { style: 'short' })
            ))
        );
    }

    public applyGlobalReharmonization(progression: SequenceItem[], key: DetectedKey, settings: ReharmonizationSettings): ProcessedSong {
        console.log(`Aplicando rearmonización global en la tonalidad de ${key.key} ${key.scale} con los ajustes:`, settings);
        
        const reharmonizedChords = progression.map(chord => {
            return { chord: chord, position: 0 };
        });

        return { lines: [{ lyrics: '', chords: reharmonizedChords }], allChords: progression };
    }
}

export const IntelliHarmonix = new IntelliHarmonixEngine();
