import React, { useState, useEffect, useRef, useCallback } from 'react';
import { formatChordName, getChordNotes, calculateOptimalPianoRange } from '../utils/chord-utils';
import { createPiano } from '../utils/piano-renderer';
import { TranspositionManager } from '../utils/transposition-manager';
import { SheetManager } from '../utils/sheet-manager';
import type { ProcessedSong, SequenceItem, ShowInspectorFn, SongChord } from '../types';
import type { AudioEngine } from '../utils/audio';

interface ComposerModeProps {
  audioEngine: AudioEngine;
  showInspector: ShowInspectorFn;
  song: ProcessedSong | null;
  isActive: boolean;
}

const ComposerMode: React.FC<ComposerModeProps> = ({ audioEngine, showInspector, song, isActive }) => {
  const [currentSong, setCurrentSong] = useState<ProcessedSong | null>(song);
  const [nextChordId, setNextChordId] = useState<number>(1);
  const [transpositionOffset, setTranspositionOffset] = useState<number>(0);
  const [composerChordNameDisplay, setComposerChordNameDisplay] = useState<string>('');
  const [isInsertionIndicatorVisible, setIsInsertionIndicatorVisible] = useState<boolean>(false);
  const [insertionIndicatorPosition, setInsertionIndicatorPosition] = useState<{ x: number, y: number } | null>(null);

  const compositionOutputRef = useRef<HTMLDivElement>(null);
  const composerPianoDisplayRef = useRef<HTMLDivElement>(null);
  const transpositionDisplayRef = useRef<HTMLDivElement>(null);

  const transpositionManagerRef = useRef<TranspositionManager | null>(null);
  const sheetManagerRef = useRef<SheetManager | null>(null);
  
  const currentSongRef = useRef(currentSong);
  useEffect(() => { currentSongRef.current = currentSong; }, [currentSong]);
  const transpositionOffsetRef = useRef(transpositionOffset);
  useEffect(() => { transpositionOffsetRef.current = transpositionOffset; }, [transpositionOffset]);

  const updateDisplayPiano = useCallback((item: SequenceItem): void => {
    const currentTransposition = transpositionOffsetRef.current;
    const { notesToPress, bassNoteIndex, allNotesForRange } = getChordNotes(item, currentTransposition);
    setComposerChordNameDisplay(formatChordName(item, { style: 'short' }, currentTransposition));
    if (composerPianoDisplayRef.current) {
      if (allNotesForRange.length > 0) {
        const { startNote, endNote } = calculateOptimalPianoRange(allNotesForRange, 15, 2);
        createPiano(composerPianoDisplayRef.current, startNote, endNote, notesToPress, true, bassNoteIndex);
      } else {
        composerPianoDisplayRef.current.innerHTML = '';
      }
    }
  }, []);

  const addChordToSongData = useCallback((item: SequenceItem, target: { lineIndex: number; charIndex: number }) => {
    if (!currentSongRef.current || item.id === undefined || !target) return;
    const newItem = { ...item, raw: formatChordName(item, { style: 'short' }, transpositionOffsetRef.current) };
    const targetLine = currentSongRef.current.lines[target.lineIndex];
    if (targetLine) {
      const safePosition = Math.min(target.charIndex, targetLine.lyrics.length);
      const newSongChord: SongChord = { chord: newItem, position: safePosition };
      const newLines = [...currentSongRef.current.lines];
      newLines[target.lineIndex] = { ...targetLine, chords: [...targetLine.chords, newSongChord].sort((a, b) => a.position - b.position) };
      setCurrentSong(prevSong => prevSong ? { ...prevSong, lines: newLines, allChords: [...prevSong.allChords, newItem] } : null);
    }
  }, []);
  
  const updateChordInSong = useCallback((updatedItem: SequenceItem) => {
    if (!currentSongRef.current || updatedItem.id === undefined) return;
    const newLines = currentSongRef.current.lines.map(line => ({ ...line, chords: line.chords.map(sc => sc.chord.id === updatedItem.id ? { ...sc, chord: updatedItem } : sc) }));
    const newAllChords = currentSongRef.current.allChords.map(chord => chord.id === updatedItem.id ? updatedItem : chord);
    setCurrentSong(prevSong => prevSong ? { ...prevSong, lines: newLines, allChords: newAllChords } : null);
  }, []);

  const handleDeleteChord = useCallback((itemToDelete: SequenceItem): void => {
    if (!currentSongRef.current || itemToDelete.id === undefined) return;
    const newAllChords = currentSongRef.current.allChords.filter(c => c.id !== itemToDelete.id);
    const newLines = currentSongRef.current.lines.map(line => ({ ...line, chords: line.chords.filter(sc => sc.chord.id !== itemToDelete.id) }));
    setCurrentSong(prevSong => prevSong ? { ...prevSong, lines: newLines, allChords: newAllChords } : null);
  }, []);

  const handleExportSong = useCallback(() => {
    if (!currentSong) return;
    const songJson = JSON.stringify(currentSong, null, 2);
    const blob = new Blob([songJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'my_song.chordsong';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [currentSong]);

  const handleImportSong = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.chordsong,.json';
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          const content = await file.text();
          const importedSong = JSON.parse(content);
          setCurrentSong(importedSong);
        } catch (error) {
          console.error("Error al importar el archivo:", error);
        }
      }
    };
    input.click();
  }, []);

  const getCharWidth = useCallback((element: HTMLElement): number => {
    const span = document.createElement('span');
    span.textContent = '0';
    span.style.cssText = 'visibility:hidden; position:absolute;';
    element.appendChild(span);
    const width = span.getBoundingClientRect().width;
    element.removeChild(span);
    return width || 10;
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const songLineEl = target.closest<HTMLElement>('.song-line');
    if (!songLineEl) { setIsInsertionIndicatorVisible(false); return; }
    const lyricsEl = songLineEl.querySelector('.lyrics-layer');
    const chordActionEl = target.closest('.chord-action, .chord-annotation');
    if (lyricsEl && !chordActionEl) {
      setIsInsertionIndicatorVisible(true);
      setInsertionIndicatorPosition({ x: e.pageX, y: e.pageY });
    } else { setIsInsertionIndicatorVisible(false); }
  }, []);

  const handleMouseLeave = useCallback(() => setIsInsertionIndicatorVisible(false), []);

  const handleInsertionClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const lyricsEl = target.closest<HTMLElement>('.lyrics-layer');
    const chordActionEl = target.closest('.chord-action, .chord-annotation');
    if (!lyricsEl || chordActionEl) return;
    const songLineEl = lyricsEl.closest<HTMLElement>('.song-line')!;
    const lineIndex = parseInt(songLineEl.dataset.lineIndex || '0', 10);
    const rect = lyricsEl.getBoundingClientRect();
    const charWidth = getCharWidth(lyricsEl);
    const charIndex = Math.round((e.clientX - rect.left) / charWidth);
    const capturedInsertionTarget = { lineIndex, charIndex: Math.max(0, Math.min(charIndex, (lyricsEl.textContent || '').length)) };
    const newChordTemplate: SequenceItem = { rootNote: 'C', type: 'Mayor', inversion: 0 };
    showInspector(newChordTemplate, {
      onUpdate: () => {},
      onInsert: (chordToInsert) => {
        const newId = nextChordId;
        addChordToSongData({ ...chordToInsert, id: newId }, capturedInsertionTarget);
        setNextChordId(prevId => prevId + 1);
      },
      onDelete: () => {},
    });
  }, [nextChordId, getCharWidth, showInspector, addChordToSongData]);

  const handleTransposeUp = useCallback(() => {
    transpositionManagerRef.current?.up();
    setTranspositionOffset(transpositionManagerRef.current?.getOffset() || 0);
  }, []);

  const handleTransposeDown = useCallback(() => {
    transpositionManagerRef.current?.down();
    setTranspositionOffset(transpositionManagerRef.current?.getOffset() || 0);
  }, []);

  useEffect(() => {
    if (song) {
      setCurrentSong(song);
      const maxId = Math.max(0, ...song.allChords.map(c => c.id || 0));
      setNextChordId(maxId + 1);
      setTranspositionOffset(0);
      transpositionManagerRef.current?.reset();
    }
  }, [song]);

  useEffect(() => {
    if (transpositionDisplayRef.current && !transpositionManagerRef.current) {
      transpositionManagerRef.current = new TranspositionManager(transpositionDisplayRef.current, () => sheetManagerRef.current?.render(currentSongRef.current, transpositionOffsetRef.current));
    }
    if (compositionOutputRef.current && !sheetManagerRef.current) {
      sheetManagerRef.current = new SheetManager({ container: compositionOutputRef.current, audioEngine, showInspector, updateChord: updateChordInSong, deleteChord: handleDeleteChord, onChordClick: updateDisplayPiano, getTransposition: () => transpositionOffsetRef.current, getSong: () => currentSongRef.current });
    }
  }, [audioEngine, showInspector, updateChordInSong, handleDeleteChord, updateDisplayPiano]);

  useEffect(() => {
    sheetManagerRef.current?.render(currentSong, transpositionOffset);
  }, [currentSong, transpositionOffset]);

  return (
    <main id="composer-mode" className={`mode-content ${isActive ? 'block' : 'hidden'}`}>
      <div className="composition-header">
        <div className="piano-and-name-container">
          <h2 id="composer-chord-name-display" className="text-neon-blue text-shadow-neon-blue text-clamp-lg font-bold font-victor-mono m-0 transition-colors">
            {composerChordNameDisplay || 'Selecciona o añade un acorde'}
          </h2>
          <div 
            id="composer-piano-display" 
            className="piano-container-small" 
            ref={composerPianoDisplayRef}>
          </div>
        </div>
        <div className="composer-controls">
          <div className="transposition-controls-group">
            <button className="btn-control" onClick={handleTransposeDown}>-</button>
            <div ref={transpositionDisplayRef} className="transposition-display-segment">Original</div>
            <button className="btn-control" onClick={handleTransposeUp}>+</button>
          </div>
          <div className="flex items-center gap-3">
             <button className="btn-composer-action" onClick={handleExportSong}>Exportar</button>
             <button className="btn-composer-action" onClick={handleImportSong}>Importar</button>
          </div>
        </div>
      </div>
      <div id="composition-output" className="song-sheet-container" ref={compositionOutputRef} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave} onClick={handleInsertionClick}>
      </div>
      {isInsertionIndicatorVisible && insertionIndicatorPosition && (
        <div
          id="chord-insertion-indicator"
          className="inline-flex items-center justify-center w-6 h-6 text-accent-green border border-dashed border-accent-green rounded-full text-xl leading-none transition-opacity duration-200 absolute pointer-events-none z-10 opacity-100"
          style={{
            left: insertionIndicatorPosition.x,
            top: insertionIndicatorPosition.y,
            transform: 'translate(-50%, -50%)',
          }}
        >+</div>
      )}
    </main>
  );
};

export default ComposerMode;
