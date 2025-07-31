import React, { useState, useEffect, useRef, useCallback } from 'react';
import { parseSongText, transposeNote } from '../utils/chord-utils';
import { TranspositionManager } from '../utils/transposition-manager';
import { SheetManager } from '../utils/sheet-manager';
import type { ProcessedSong, SequenceItem, ShowInspectorFn } from '../types';
import type { AudioEngine } from '../utils/audio';
// CORRECCIÓN: Se importa AppMode para usarlo en las props
import type { AppMode } from './Navbar';

// CORRECCIÓN: Se actualiza la interfaz de Props
interface ExtractorModeProps {
  audioEngine: AudioEngine;
  showInspector: ShowInspectorFn;
  addToComposer: (song: ProcessedSong) => void;
  onModeChange: (mode: AppMode) => void; // Se añade la prop que faltaba
}

const ExtractorMode: React.FC<ExtractorModeProps> = ({ audioEngine, showInspector, addToComposer, onModeChange }) => {
  const [songInput, setSongInput] = useState<string>('');
  const [processedSong, setProcessedSong] = useState<ProcessedSong | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [transpositionOffset, setTranspositionOffset] = useState<number>(0);

  const songOutputRef = useRef<HTMLDivElement>(null);
  const transpositionDisplayRef = useRef<HTMLDivElement>(null); 

  const transpositionManagerRef = useRef<TranspositionManager | null>(null);
  const sheetManagerRef = useRef<SheetManager | null>(null);

  const processedSongRef = useRef<ProcessedSong | null>(null);
  const transpositionOffsetRef = useRef<number>(0);

  useEffect(() => {
    processedSongRef.current = processedSong;
  }, [processedSong]);

  useEffect(() => {
    transpositionOffsetRef.current = transpositionOffset;
  }, [transpositionOffset]);

  useEffect(() => {
    if (transpositionDisplayRef.current && !transpositionManagerRef.current && processedSong) {
      transpositionManagerRef.current = new TranspositionManager(
        transpositionDisplayRef.current,
        () => sheetManagerRef.current?.render(processedSongRef.current, transpositionOffsetRef.current)
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
  }, [processedSong, audioEngine, showInspector]);

  useEffect(() => {
    sheetManagerRef.current?.render(processedSong, transpositionOffset);
  }, [processedSong, transpositionOffset]);

  const handleProcessSong = useCallback(() => {
    if (!songInput.trim()) return;
    setIsLoading(true);
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
    transpositionManagerRef.current = null;
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
      onModeChange('composer'); // <-- CORRECCIÓN: Cambia al modo compositor
    }
  }, [processedSong, transpositionOffset, addToComposer, onModeChange]);

  const handleTransposeUp = useCallback(() => {
    transpositionManagerRef.current?.up();
    setTranspositionOffset(transpositionManagerRef.current?.getOffset() || 0);
  }, []);

  const handleTransposeDown = useCallback(() => {
    transpositionManagerRef.current?.down();
    setTranspositionOffset(transpositionManagerRef.current?.getOffset() || 0);
  }, []);

  // CORRECCIÓN: Se elimina el contenedor <main> y la prop 'isActive'
  return (
    <>
      <p className="hidden">Pega la letra y los acordes de una canción. Haz clic en un acorde para ver su diagrama y escucharlo.</p>
      <div className="input-panel">
        <textarea
          id="song-input"
          placeholder="Pega o escribe tu canción aquí...."
          value={songInput}
          onChange={(e) => setSongInput(e.target.value)}
          className="textarea-style"
        ></textarea>
        
        <div className="button-row">
          <div className="main-actions-group">
            <button id="process-song-btn" className="btn-azul" onClick={handleProcessSong}>Analizar</button>
            <button id="add-to-composer-btn" className="btn-verde" onClick={handleAddToComposer} disabled={!processedSong || processedSong.allChords.length === 0}>Añadir al Compositor</button>
            <button id="clear-extractor-btn" className="btn-rojo" onClick={handleClearExtractor}>Limpiar</button>
          </div>
          
          {processedSong && processedSong.allChords.length > 0 && (
            <div id="transposition-controls" className="transposition-controls-group">
              <button id="transpose-down-btn" className="btn-control" onClick={handleTransposeDown}>-</button>
              <div id="transposition-display" ref={transpositionDisplayRef} className="transposition-display-segment">Original</div>
              <button id="transpose-up-btn" className="btn-control" onClick={handleTransposeUp}>+</button>
            </div>
          )}
        </div>
      </div>

      {isLoading && (
        <div id="extractor-loader" className="flex flex-col justify-center items-center gap-4 my-10 text-text-muted">
          <div className="w-10 h-10 border-4 border-solid border-grey border-t-accent-green rounded-full animate-spin"></div>
          <p>Analizando...</p>
        </div>
      )}

      <div id="song-output" className="text-left bg-bg-card rounded-xl p-10 mt-6 font-jetbrains overflow-x-auto" ref={songOutputRef}>
      </div>
    </>
  );
};

export default ExtractorMode;
