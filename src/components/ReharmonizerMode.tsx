import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { SequenceItem, ProcessedSong, DetectedKey, ChordSuggestion, ShowInspectorFn, SongChord } from '../types';
import { IntelliHarmonix } from '../utils/reharmonization-engine';
import { formatChordName } from '../utils/chord-utils';
import { INDEX_TO_SHARP_NAME } from '../utils/constants';
import { SheetManager } from '../utils/sheet-manager';
import type { AudioEngine } from '../utils/audio';
// Se importa el nuevo modal
import DraggableModal from './DraggableModal';

const ALL_KEYS: DetectedKey[] = [];
for (let i = 0; i < 12; i++) {
    ALL_KEYS.push({ key: INDEX_TO_SHARP_NAME[i], scale: 'Major' });
    ALL_KEYS.push({ key: INDEX_TO_SHARP_NAME[i], scale: 'Minor' });
}

interface ReharmonizerModeProps {
  song: ProcessedSong | null;
  audioEngine: AudioEngine;
  showInspector: ShowInspectorFn;
}

const ReharmonizerMode: React.FC<ReharmonizerModeProps> = ({ song, audioEngine, showInspector }) => {
    const [currentSong, setCurrentSong] = useState<ProcessedSong | null>(song);
    const [currentKey, setCurrentKey] = useState<DetectedKey>({ key: 'C', scale: 'Major' });
    const [activeSuggestions, setActiveSuggestions] = useState<ChordSuggestion[]>([]);
    const [isSuggestionModalVisible, setSuggestionModalVisible] = useState(false);
    const [nextChordId, setNextChordId] = useState<number>(1);
    const [activeChord, setActiveChord] = useState<SequenceItem | null>(null);
    const [insertionContext, setInsertionContext] = useState<{lineIndex: number, charIndex: number, prevChord: SequenceItem, nextChord: SequenceItem} | null>(null);

    const songSheetRef = useRef<HTMLDivElement>(null);
    const sheetManagerRef = useRef<SheetManager | null>(null);
    const currentSongRef = useRef(currentSong);
    useEffect(() => { currentSongRef.current = currentSong; }, [currentSong]);

    useEffect(() => {
        setCurrentSong(song);
        if (song) {
            const maxId = Math.max(0, ...song.allChords.map(c => c.id || 0));
            setNextChordId(maxId + 1);
        }
    }, [song]);

    const updateChordInSong = useCallback((updatedItem: SequenceItem) => {
        if (!currentSongRef.current || updatedItem.id === undefined) return;
        const newLines = currentSongRef.current.lines.map(line => ({ ...line, chords: line.chords.map(sc => sc.chord.id === updatedItem.id ? { ...sc, chord: updatedItem } : sc) }));
        const newAllChords = currentSongRef.current.allChords.map(chord => chord.id === updatedItem.id ? updatedItem : chord);
        setCurrentSong(prevSong => prevSong ? { ...prevSong, lines: newLines, allChords: newAllChords } : null);
    }, []);
    
    const addChordToSongData = useCallback((item: SequenceItem, target: { lineIndex: number; charIndex: number }) => {
        if (!currentSongRef.current || item.id === undefined || !target) return;
        const newItem = { ...item, raw: formatChordName(item, { style: 'short' }) };
        const targetLine = currentSongRef.current.lines[target.lineIndex];
        if (targetLine) {
            const newSongChord: SongChord = { chord: newItem, position: target.charIndex };
            const newLines = [...currentSongRef.current.lines];
            newLines[target.lineIndex] = { ...targetLine, chords: [...targetLine.chords, newSongChord].sort((a, b) => a.position - b.position) };
            setCurrentSong(prevSong => prevSong ? { ...prevSong, lines: newLines, allChords: [...prevSong.allChords, newItem] } : null);
        }
    }, []);

    useEffect(() => {
        if (isSuggestionModalVisible && activeChord) {
            const suggestions = IntelliHarmonix.getSuggestionsForChord(activeChord, currentKey);
            setActiveSuggestions(suggestions);
        }
    }, [activeChord, currentKey, isSuggestionModalVisible]);


    useEffect(() => {
        if (songSheetRef.current && !sheetManagerRef.current) {
            sheetManagerRef.current = new SheetManager({
                container: songSheetRef.current,
                audioEngine: audioEngine,
                showInspector: showInspector,
                updateChord: updateChordInSong,
                deleteChord: () => {},
                onChordClick: (chord) => {
                    setActiveChord(chord);
                    setSuggestionModalVisible(true);
                },
                getTransposition: () => 0,
                getSong: () => currentSongRef.current,
            });
        }
    }, [audioEngine, showInspector, updateChordInSong]);

    useEffect(() => {
        sheetManagerRef.current?.render(currentSong, 0);
    }, [currentSong]);

    const handleKeyChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const [key, scale] = event.target.value.split('-');
        setCurrentKey({ key, scale: scale as 'Major' | 'Minor' });
    };

    const getCharWidth = useCallback((element: HTMLElement): number => {
        const span = document.createElement('span');
        span.textContent = '0';
        span.style.cssText = 'visibility:hidden; position:absolute;';
        element.appendChild(span);
        const width = span.getBoundingClientRect().width;
        element.removeChild(span);
        return width || 10;
    }, []);

    const handleSheetClick = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        const lyricsEl = target.closest<HTMLElement>('.lyrics-layer');
        const chordActionEl = target.closest('.chord-action, .chord-annotation');

        if (!lyricsEl || chordActionEl || !currentSongRef.current) return;

        const songLineEl = lyricsEl.closest<HTMLElement>('.song-line');
        if (!songLineEl) return;

        const lineIndex = parseInt(songLineEl.dataset.lineIndex || '0', 10);
        
        const charWidth = getCharWidth(lyricsEl);
        const rect = lyricsEl.getBoundingClientRect();
        const charIndex = Math.round((e.clientX - rect.left) / charWidth);
        const lineChords = currentSongRef.current.lines[lineIndex]?.chords || [];

        const prevChord = lineChords.filter(c => c.position < charIndex).pop()?.chord;
        const nextChord = lineChords.find(c => c.position >= charIndex)?.chord;

        if (prevChord && nextChord) {
            setInsertionContext({lineIndex, charIndex, prevChord, nextChord});
            const suggestions = IntelliHarmonix.getPassingChordSuggestions(prevChord, nextChord, currentKey);
            setActiveSuggestions(suggestions);
            setActiveChord(null);
            setSuggestionModalVisible(true);
        } else {
            console.log("Clic en espacio no válido para sugerencia de acorde de paso.");
        }
    };
    
    const handleSuggestionClick = (suggestedChord: SequenceItem) => {
        if (activeChord) {
            updateChordInSong({ ...suggestedChord, id: activeChord.id });
        } else if (insertionContext) {
            const { lineIndex, charIndex } = insertionContext;
            addChordToSongData({ ...suggestedChord, id: nextChordId }, { lineIndex, charIndex });
            setNextChordId(prevId => prevId + 1);
        }
        setSuggestionModalVisible(false);
        setActiveChord(null);
        setInsertionContext(null);
    };

    

    return (
        <div className="reharmonizer-container bg-dark-main">
            <div className="selector">
                <label className="selector-label" htmlFor="key-select">TONALIDAD</label>
                <select
                    id="key-select"
                    value={`${currentKey.key}-${currentKey.scale}`}
                    onChange={handleKeyChange}
                    className="selector-box"
                >
                    {ALL_KEYS.map(k => (
                        <option key={`${k.key}-${k.scale}`} value={`${k.key}-${k.scale}`}>
                            {k.key} {k.scale}
                        </option>
                    ))}
                </select>
            </div>

            <div 
                id="reharm-song-sheet" 
                className="song-sheet-container" 
                ref={songSheetRef}
                onClick={handleSheetClick}
            >
                {!currentSong && <p className="text-text-muted p-4">Carga una canción desde el Compositor para empezar a rearmonizar.</p>}
            </div>

            {/* Se reemplaza el panel antiguo por el nuevo modal */}
            <DraggableModal
                isVisible={isSuggestionModalVisible}
                onClose={() => setSuggestionModalVisible(false)}
                suggestions={activeSuggestions}
                onSuggestionClick={handleSuggestionClick}
                activeChord={activeChord}
            />
        </div>
    );
};

export default ReharmonizerMode;
