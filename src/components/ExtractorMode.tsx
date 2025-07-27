import React, { useState, useEffect, useRef, useCallback } from 'react';
import { parseSongText, transposeNote } from '../utils/chord-utils';
import { TranspositionManager } from '../utils/transposition-manager';
import { SheetManager } from '../utils/sheet-manager';
import type { ProcessedSong, SequenceItem, ShowInspectorFn } from '../types';
import type { AudioEngine } from '../utils/audio';

interface ExtractorModeProps {
  audioEngine: AudioEngine;
  showInspector: ShowInspectorFn;
  addToComposer: (song: ProcessedSong) => void;
  isActive: boolean; // Nueva prop
}

const ExtractorMode: React.FC<ExtractorModeProps> = ({ audioEngine, showInspector, addToComposer, isActive }) => {
  const [songInput, setSongInput] = useState<string>('');
  const [processedSong, setProcessedSong] = useState<ProcessedSong | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [transpositionOffset, setTranspositionOffset] = useState<number>(0);

  const songOutputRef = useRef<HTMLDivElement>(null);
  const transpositionDisplayRef = useRef<HTMLSpanElement>(null);

  const transpositionManagerRef = useRef<TranspositionManager | null>(null);
  const sheetManagerRef = useRef<SheetManager | null>(null);

  const processedSongRef = useRef<ProcessedSong | null>(null);
  const transpositionOffsetRef = useRef<number>(0);

  // Update refs whenever state changes
  useEffect(() => {
    processedSongRef.current = processedSong;
  }, [processedSong]);

  useEffect(() => {
    transpositionOffsetRef.current = transpositionOffset;
  }, [transpositionOffset]);

  // Initialize TranspositionManager and SheetManager once
  useEffect(() => {
    if (transpositionDisplayRef.current && !transpositionManagerRef.current) {
      transpositionManagerRef.current = new TranspositionManager(
        transpositionDisplayRef.current,
        () => sheetManagerRef.current?.render(processedSongRef.current, transpositionOffsetRef.current) // Use refs for latest values
      );
    }

    if (songOutputRef.current && !sheetManagerRef.current) {
    sheetManagerRef.current = new SheetManager({
      container: songOutputRef.current,
      audioEngine: audioEngine,
      showInspector: showInspector,
      updateChord: (updatedItem: SequenceItem) => {
        const currentSong = processedSongRef.current;
        if (!currentSong || updatedItem.id === undefined) return;
        const newProcessedSong = { ...currentSong };
        let found = false;
        for (const line of newProcessedSong.lines) {
          for (const songChord of line.chords) {
            if (songChord.chord.id === updatedItem.id) {
              songChord.chord = updatedItem;
              found = true;
              break;
            }
          }
          if (found) break;
        }
        const index = newProcessedSong.allChords.findIndex(c => c.id === updatedItem.id);
        if (index > -1) {
          newProcessedSong.allChords[index] = updatedItem;
        }
        setProcessedSong(newProcessedSong);
      },
      deleteChord: (itemToDelete: SequenceItem) => {
        const currentSong = processedSongRef.current;
        if (!currentSong || itemToDelete.id === undefined) return;
        const newProcessedSong = { ...currentSong };
        newProcessedSong.allChords = newProcessedSong.allChords.filter(c => c.id !== itemToDelete.id);
        newProcessedSong.lines.forEach(line => {
          line.chords = line.chords.filter(sc => sc.chord.id !== itemToDelete.id);
        });
        setProcessedSong(newProcessedSong);
      },
      getTransposition: () => transpositionOffsetRef.current,
      getSong: () => processedSongRef.current
    });

    }
  }, [audioEngine, showInspector]); // Empty dependency array for one-time initialization

  // Render sheet when processedSong or transpositionOffset changes
  useEffect(() => {
    sheetManagerRef.current?.render(processedSong, transpositionOffset);
  }, [processedSong, transpositionOffset]);

  const handleProcessSong = useCallback(() => {
    if (!songInput.trim()) return;
    setIsLoading(true);
    setProcessedSong(null);

    setTimeout(() => {
      try {
        const parsedSong = parseSongText(songInput);
        if (parsedSong) {
          let idCounter = 0;
          parsedSong.allChords.forEach(chord => {
            chord.id = idCounter++;
          });
        }
        setProcessedSong(parsedSong);
        transpositionManagerRef.current?.reset();
        setTranspositionOffset(0);
      } catch (error) {
        console.error("Error al procesar la canción:", error);
        if (songOutputRef.current) {
          songOutputRef.current.textContent = "Hubo un error al analizar la canción.";
        }
      } finally {
        setIsLoading(false);
      }
    }, 50);
  }, [songInput]);

  const handleClearExtractor = useCallback(() => {
    setSongInput('');
    setProcessedSong(null);
    setTranspositionOffset(0);
    transpositionManagerRef.current?.reset();
  }, []);

  const handleAddToComposer = useCallback(() => {
    if (processedSong) {
      const songForComposer = JSON.parse(JSON.stringify(processedSong));
      const currentOffset = transpositionOffset;

      if (currentOffset !== 0) {
        songForComposer.allChords.forEach((chord: SequenceItem) => {
          if (chord.rootNote) {
            chord.rootNote = transposeNote(chord.rootNote, currentOffset);
          }
          if (chord.bassNote) {
            chord.bassNote = transposeNote(chord.bassNote, currentOffset);
          }
        });
      }
      addToComposer(songForComposer);
    }
  }, [processedSong, transpositionOffset, addToComposer]);

  const handleTransposeUp = useCallback(() => {
    transpositionManagerRef.current?.up();
    setTranspositionOffset(transpositionManagerRef.current?.getOffset() || 0);
  }, []);

  const handleTransposeDown = useCallback(() => {
    transpositionManagerRef.current?.down();
    setTranspositionOffset(transpositionManagerRef.current?.getOffset() || 0);
  }, []);

  return (
    <main id="extractor-mode" className={`mode-content ${isActive ? 'active' : ''}`}>
      <p className="description" style={{ maxWidth: '650px' }}>Pega la letra y los acordes de una canción. Haz clic en un acorde para ver su diagrama y escucharlo.</p>
      <textarea
        id="song-input"
        placeholder="Pega o escribe tu canción aquí...."
        value={songInput}
        onChange={(e) => setSongInput(e.target.value)}
      ></textarea>
      
      <div className="extractor-controls-container">
        <div className="extractor-actions-left">
          <button id="process-song-btn" className="button-primary" onClick={handleProcessSong}>Analizar</button>
          <button id="add-to-composer-btn" className="button-secondary" onClick={handleAddToComposer} disabled={!processedSong || processedSong.allChords.length === 0}>Añadir al Compositor</button>
          <button id="clear-extractor-btn" className="button-secondary" onClick={handleClearExtractor}>Limpiar</button>
        </div>
        <div className="extractor-actions-right">
          <div id="transposition-controls" className="transposition-controls" style={{ display: processedSong && processedSong.allChords.length > 0 ? 'flex' : 'none' }}>
            <button id="transpose-down-btn" className="button-secondary" onClick={handleTransposeDown}>-</button>
            <span id="transposition-display" ref={transpositionDisplayRef}>Original</span>
            <button id="transpose-up-btn" className="button-secondary" onClick={handleTransposeUp}>+</button>
          </div>
        </div>
      </div>
      
      {isLoading && (
        <div id="extractor-loader" className="loader-container">
          <div className="spinner"></div>
          <p>Analizando...</p>
        </div>
      )}
      <div id="song-output" className="song-sheet-container" ref={songOutputRef}>
      </div>
    </main>
  );
};

export default ExtractorMode;