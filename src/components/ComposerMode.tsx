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
  isActive: boolean; // Nueva prop
}

const ComposerMode: React.FC<ComposerModeProps> = ({ audioEngine, showInspector, song, isActive }) => {
  const [currentSong, setCurrentSong] = useState<ProcessedSong | null>(song);
  const [nextChordId, setNextChordId] = useState<number>(1);
  const [currentInsertingChordId, setCurrentInsertingChordId] = useState<number | null>(null);
  const [transpositionOffset, setTranspositionOffset] = useState<number>(0);
  const [composerChordNameDisplay, setComposerChordNameDisplay] = useState<string>('');
  const [isInsertionIndicatorVisible, setIsInsertionIndicatorVisible] = useState<boolean>(false);
  const [insertionIndicatorPosition, setInsertionIndicatorPosition] = useState<{ x: number, y: number } | null>(null);

  const compositionOutputRef = useRef<HTMLDivElement>(null);
  const composerPianoDisplayRef = useRef<HTMLDivElement>(null);
  const transpositionDisplayRef = useRef<HTMLSpanElement>(null);
  const insertionIndicatorRef = useRef<HTMLDivElement>(null);

  const transpositionManagerRef = useRef<TranspositionManager | null>(null);
  const sheetManagerRef = useRef<SheetManager | null>(null);

  // Callbacks for SheetManager and other functions
  const updateDisplayPiano = useCallback((item: SequenceItem): void => {
    const currentTransposition = transpositionOffset;
    const { notesToPress, bassNoteIndex, allNotesForRange } = getChordNotes(item, currentTransposition);

    setComposerChordNameDisplay(formatChordName(item, { style: 'long' }, currentTransposition));

    if (composerPianoDisplayRef.current) {
      if (allNotesForRange.length > 0) {
        const { startNote, endNote } = calculateOptimalPianoRange(allNotesForRange, 15, 2);
        createPiano(composerPianoDisplayRef.current, startNote, endNote, notesToPress, true, bassNoteIndex);
      } else {
        composerPianoDisplayRef.current.innerHTML = '';
      }
    }
  }, [transpositionOffset]);

  const addChordToSongData = useCallback((item: SequenceItem, target: { lineIndex: number; charIndex: number }) => {
    if (!currentSong || item.id === undefined || !target) return;

    const newItem = { ...item, raw: formatChordName(item, { style: 'short' }, transpositionOffset) };
    const targetLine = currentSong.lines[target.lineIndex];
    if (targetLine) {
      const safePosition = Math.min(target.charIndex, targetLine.lyrics.length);
      const newSongChord: SongChord = { chord: newItem, position: safePosition };

      const newLines = [...currentSong.lines];
      newLines[target.lineIndex] = {
        ...targetLine,
        chords: [...targetLine.chords, newSongChord].sort((a, b) => a.position - b.position),
      };

      setCurrentSong(prevSong => {
        if (!prevSong) return null;
        return {
          ...prevSong,
          lines: newLines,
          allChords: [...prevSong.allChords, newItem],
        };
      });
    }
  }, [currentSong, transpositionOffset]);

  const updateChordInSong = useCallback((updatedItem: SequenceItem) => {
    if (!currentSong || updatedItem.id === undefined) return;

    const newLines = currentSong.lines.map(line => ({
      ...line,
      chords: line.chords.map(songChord =>
        songChord.chord.id === updatedItem.id ? { ...songChord, chord: updatedItem } : songChord
      ),
    }));

    const newAllChords = currentSong.allChords.map(chord =>
      chord.id === updatedItem.id ? updatedItem : chord
    );

    setCurrentSong(prevSong => {
      if (!prevSong) return null;
      return {
        ...prevSong,
        lines: newLines,
        allChords: newAllChords,
      };
    });
  }, [currentSong]);

  const handleDeleteChord = useCallback((itemToDelete: SequenceItem): void => {
    if (!currentSong || itemToDelete.id === undefined) return;

    const newAllChords = currentSong.allChords.filter(c => c.id !== itemToDelete.id);
    const newLines = currentSong.lines.map(line => ({
      ...line,
      chords: line.chords.filter(sc => sc.chord.id !== itemToDelete.id),
    }));

    setCurrentSong(prevSong => {
      if (!prevSong) return null;
      return {
        ...prevSong,
        lines: newLines,
        allChords: newAllChords,
      };
    });
  }, [currentSong]);

  const handleExportSong = useCallback(() => {
    if (!currentSong) {
      alert('No hay canción para exportar.');
      return;
    }
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
          alert('Canción importada exitosamente.');
        } catch (error: any) {
          console.error("Error al importar el archivo de canción:", error);
          alert("Error al importar la canción: " + error.message);
        }
      }
    };
    input.click();
  }, []);

  const getCharWidth = useCallback((element: HTMLElement): number => {
    const span = document.createElement('span');
    span.textContent = '0';
    span.style.visibility = 'hidden';
    span.style.position = 'absolute';
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

  const handleMouseLeave = useCallback(() => {
    setIsInsertionIndicatorVisible(false);
  }, []);

  const handleInsertionClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const lyricsEl = target.closest<HTMLElement>('.lyrics-layer');
    const chordActionEl = target.closest('.chord-action, .chord-annotation');
    if (!lyricsEl || chordActionEl) return;

    if (!currentSong) {
      setCurrentSong({ lines: [{ lyrics: '', chords: [], isInstrumental: false }], allChords: [] });
      setNextChordId(1);
    }

    const songLineEl = lyricsEl.closest<HTMLElement>('.song-line')!;
    const lineIndex = parseInt(songLineEl.dataset.lineIndex || '0', 10);

    const rect = lyricsEl.getBoundingClientRect();
    const charWidth = getCharWidth(lyricsEl);
    const relativeX = e.clientX - rect.left;
    let charIndex = Math.round(relativeX / charWidth);
    const text = lyricsEl.textContent || '';
    charIndex = Math.max(0, Math.min(charIndex, text.length));

    const capturedInsertionTarget = { lineIndex, charIndex };
    setCurrentInsertingChordId(null);

    const newChordTemplate: SequenceItem = { rootNote: 'C', type: 'Mayor', inversion: 0 };

    showInspector(newChordTemplate, {
      onUpdate: (chordBeingBuilt) => {
        if (currentInsertingChordId === null) {
          const newId = nextChordId;
          setCurrentInsertingChordId(newId);
          setNextChordId(prevId => prevId + 1);
          addChordToSongData({ ...chordBeingBuilt, id: newId }, capturedInsertionTarget);
        } else {
          updateChordInSong(chordBeingBuilt);
        }
      },
      onInsert: (chordToInsert) => {
        if (currentInsertingChordId === null) {
          const newId = nextChordId;
          setCurrentInsertingChordId(newId);
          setNextChordId(prevId => prevId + 1);
          addChordToSongData({ ...chordToInsert, id: newId }, capturedInsertionTarget);
        }
        setIsInsertionIndicatorVisible(false);
        setCurrentInsertingChordId(null);
      },
      onDelete: () => {
        setIsInsertionIndicatorVisible(false);
        setCurrentInsertingChordId(null);
      },
    });
  }, [currentSong, nextChordId, getCharWidth, showInspector, addChordToSongData, updateChordInSong, currentInsertingChordId]);

  const handleTransposeUp = useCallback(() => {
    transpositionManagerRef.current?.up();
    setTranspositionOffset(transpositionManagerRef.current?.getOffset() || 0);
  }, []);

  const handleTransposeDown = useCallback(() => {
    transpositionManagerRef.current?.down();
    setTranspositionOffset(transpositionManagerRef.current?.getOffset() || 0);
  }, []);

  // Update currentSong when prop changes
  useEffect(() => {
    if (song) {
      setCurrentSong(song);
      const maxId = Math.max(0, ...song.allChords.map(c => c.id || 0));
      setNextChordId(maxId + 1);
      setTranspositionOffset(0);
      transpositionManagerRef.current?.reset();
    }
  }, [song]);

  const currentSongRef = useRef<ProcessedSong | null>(null);
  const transpositionOffsetRef = useRef<number>(0);

  // Update refs whenever state changes
  useEffect(() => {
    currentSongRef.current = currentSong;
  }, [currentSong]);

  useEffect(() => {
    transpositionOffsetRef.current = transpositionOffset;
  }, [transpositionOffset]);

  // Initialize TranspositionManager and SheetManager once
  useEffect(() => {
    if (transpositionDisplayRef.current && !transpositionManagerRef.current) {
      transpositionManagerRef.current = new TranspositionManager(
        transpositionDisplayRef.current,
        () => sheetManagerRef.current?.render(currentSongRef.current, transpositionOffsetRef.current) // Use refs for latest values
      );
    }

    if (compositionOutputRef.current && !sheetManagerRef.current) {
    sheetManagerRef.current = new SheetManager({
      container: compositionOutputRef.current,
      audioEngine: audioEngine,
      showInspector: showInspector,
      updateChord: updateChordInSong,
      deleteChord: handleDeleteChord,
      onChordClick: updateDisplayPiano,
      getTransposition: () => transpositionOffsetRef.current,
      getSong: () => currentSongRef.current
    });

    }
  }, [audioEngine, showInspector, updateDisplayPiano]);

  // Update SheetManager callbacks when they change
  useEffect(() => {
    if (sheetManagerRef.current) {
      sheetManagerRef.current.updateCallbacks(updateChordInSong, handleDeleteChord);
    }
  }, [updateChordInSong, handleDeleteChord]);

  // Render sheet when currentSong or transpositionOffset changes
  useEffect(() => {
    sheetManagerRef.current?.render(currentSong, transpositionOffset);
  }, [currentSong, transpositionOffset]);

  return (
    <main id="composer-mode" className={`mode-content ${isActive ? 'active' : ''}`}>
      <div className="composition-header">
        <div className="piano-and-name-container">
          <h2 id="composer-chord-name-display" className="chord-name-display">{composerChordNameDisplay}</h2>
          <div id="composer-piano-display" className="piano-container-small" ref={composerPianoDisplayRef}>
          </div>
        </div>
        <div className="composer-controls-group">
          <div id="composer-transposition-controls" className="controls">
            <button id="composer-transpose-down-btn" className="button-secondary" onClick={handleTransposeDown}>-</button>
            <span id="composer-transposition-display" ref={transpositionDisplayRef}>Original</span>
            <button id="composer-transpose-up-btn" className="button-secondary" onClick={handleTransposeUp}>+</button>
          </div>
          <div className="composer-file-controls controls">
            <button id="export-song-btn" className="button-secondary button-export" onClick={handleExportSong}>Exportar</button>
            <button id="import-song-btn" className="button-secondary button-import" onClick={handleImportSong}>Importar</button>
          </div>
        </div>
      </div>
      <div id="composition-output" ref={compositionOutputRef} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave} onClick={handleInsertionClick}>
      </div>
      {isInsertionIndicatorVisible && insertionIndicatorPosition && (
        <div
          id="chord-insertion-indicator"
          className="insert-placeholder"
          ref={insertionIndicatorRef}
          style={{
            display: 'inline-flex',
            left: insertionIndicatorPosition.x,
            top: insertionIndicatorPosition.y,
          }}
        >+
        </div>
      )}
    </main>
  );
};

export default ComposerMode;