import { useState, useEffect, useCallback, useRef } from 'react';
import Navbar from './components/Navbar';
import type { AppMode } from './components/Navbar';
import VisualizerMode from './components/VisualizerMode';
import SongEditor from './components/SongEditor';

import ChordInspectorModal from './components/ChordInspectorModal';
import DraggableModal from './components/DraggableModal'; // Importar el modal de sugerencias
import PianoDisplay from './components/PianoDisplay';
import { AudioEngine, initAudio } from './utils/audio';
import { TranspositionManager } from './utils/transposition-manager';
import { IntelliHarmonix } from './utils/reharmonization-engine'; // Importar el motor
import { INDEX_TO_SHARP_NAME } from './utils/constants';
import { formatChordName } from './utils/chord-utils'; // Importar formatChordName
import type { SequenceItem, InspectorCallbacks, ShowInspectorFn, DetectedKey, ChordSuggestion } from './types';
import './App.css';

const sampleSong = `
[Verso 1]
      Am          F      C               G 
Ejemplo de Cancioncita, solo debes añadir la letra de la cancion
  Am7          Fmaj7                   C/E       G/B
Y poner encima los acordes, no es nada complicado o si
`;

// Generar todas las tonalidades posibles para el selector
const ALL_KEYS: DetectedKey[] = [];
for (let i = 0; i < 12; i++) {
    ALL_KEYS.push({ key: INDEX_TO_SHARP_NAME[i], scale: 'Major' });
    ALL_KEYS.push({ key: INDEX_TO_SHARP_NAME[i], scale: 'Minor' });
}

function App() {
  const [activeMode, setActiveMode] = useState<AppMode>('editor');
  const [audioEngine, setAudioEngine] = useState<AudioEngine | null>(null);
  const [isAudioInitialized, setIsAudioInitialized] = useState(false);
  
  const [inspectorVisible, setInspectorVisible] = useState(false);
  const [inspectorItem, setInspectorItem] = useState<SequenceItem | null>(null);
  const [inspectorCallbacks, setInspectorCallbacks] = useState<InspectorCallbacks>({});

  const [activeChord, setActiveChord] = useState<SequenceItem | null>(null);
  const [transpositionOffset, setTranspositionOffset] = useState<number>(0);
  const [currentSongDoc, setCurrentSongDoc] = useState(sampleSong);

  // --- State para la nueva funcionalidad de rearmonización integrada ---
  const [currentKey, setCurrentKey] = useState<DetectedKey>({ key: 'C', scale: 'Major' });
  
  const [isSuggestionModalVisible, setSuggestionModalVisible] = useState(false);
  const [suggestions, setSuggestions] = useState<ChordSuggestion[]>([]);
  const [chordToReharmonize, setChordToReharmonize] = useState<{ chord: SequenceItem, callback: (newChord: SequenceItem) => void } | null>(null);
  const [insertionContext, setInsertionContext] = useState<{ lineIndex: number, charIndex: number, prevChord: SequenceItem | null, nextChord: SequenceItem | null } | null>(null);
  // --- Fin del nuevo state ---

  const displayRef = useRef<HTMLDivElement>(null);
  const transpositionManagerRef = useRef<TranspositionManager | null>(null);

  useEffect(() => {
    const engine = new AudioEngine();
    setAudioEngine(engine);
  }, []);

  useEffect(() => {
    if (displayRef.current && !transpositionManagerRef.current && activeMode === 'editor') {
      transpositionManagerRef.current = new TranspositionManager(
        displayRef.current,
        () => {
          const newOffset = transpositionManagerRef.current?.getOffset() || 0;
          setTranspositionOffset(newOffset);
        }
      );
    }
  }, [activeMode]);

  const handleFirstInteraction = useCallback(async () => {
    if (!isAudioInitialized) {
      await initAudio();
      setIsAudioInitialized(true);
      console.log("Audio Engine Initialized on user interaction.");
    }
  }, [isAudioInitialized]);

  const showInspector: ShowInspectorFn = (item, callbacks = {}) => {
    setInspectorItem(item);
    setInspectorCallbacks(callbacks);
    setInspectorVisible(true);
  };

  const handleSaveInspector = (updatedItem: SequenceItem) => {
    inspectorCallbacks.onUpdate?.(updatedItem);
    setInspectorVisible(false);
  };

  const handleDeleteInspector = (itemToDelete: SequenceItem) => {
    inspectorCallbacks.onDelete?.(itemToDelete);
    setInspectorVisible(false);
  };

  const handleInsertInspector = (itemToInsert: SequenceItem) => {
    inspectorCallbacks.onInsert?.(itemToInsert);
    setInspectorVisible(false);
  };

  const handleTransposeUp = useCallback(() => {
    transpositionManagerRef.current?.up();
  }, []);

  const handleTransposeDown = useCallback(() => {
    transpositionManagerRef.current?.down();
  }, []);

  const handleTransposeReset = useCallback(() => {
    transpositionManagerRef.current?.reset();
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = useCallback(() => {
    const songData = {
      version: "1.0",
      metadata: {
        title: "Mi Canción Exportada",
        artist: "Desconocido",
        key: currentKey.key,
        tempo: 120
      },
      songContent: currentSongDoc
    };
    const jsonString = JSON.stringify(songData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mi_cancion.chord";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [currentSongDoc, currentKey]);

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const songData = JSON.parse(content);
          if (songData && songData.songContent) {
            setCurrentSongDoc(songData.songContent);
            if (songData.metadata?.key) {
              const keyExists = ALL_KEYS.some(k => k.key === songData.metadata.key && k.scale === (songData.metadata.scale || 'Major'));
              if (keyExists) {
                setCurrentKey({ key: songData.metadata.key, scale: songData.metadata.scale || 'Major' });
              }
            }
            alert("Canción importada exitosamente!");
          } else {
            alert("Formato de archivo .chord inválido.");
          }
        } catch (error) {
          console.error("Error al importar la canción:", error);
          alert("Error al leer o parsear el archivo. Asegúrate de que sea un archivo .chord válido.");
        }
      };
      reader.readAsText(file);
    }
  }, []);

  // --- Funciones para la nueva funcionalidad ---
  const handleKeyChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const [key, scale] = event.target.value.split('-');
    setCurrentKey({ key, scale: scale as 'Major' | 'Minor' });
  };

  const handleReharmonizeClick = (chord: SequenceItem, callback: (newChord: SequenceItem) => void) => {
    setInsertionContext(null); // Limpiar contexto de inserción si se hace clic en un acorde existente
    const suggestions = IntelliHarmonix.getSuggestionsForChord(chord, currentKey);
    setSuggestions(suggestions);
    setChordToReharmonize({ chord, callback });
    setSuggestionModalVisible(true);
  };

  const handleReharmonizeSpaceClick = (lineIndex: number, charIndex: number, prevChord: SequenceItem | null, nextChord: SequenceItem | null) => {
    setChordToReharmonize(null); // Limpiar acorde a rearmonizar si se hace clic en espacio
    setInsertionContext({ lineIndex, charIndex, prevChord, nextChord });
    const suggestions = IntelliHarmonix.getPassingChordSuggestions(prevChord!, nextChord!, currentKey);
    setSuggestions(suggestions);
    setSuggestionModalVisible(true);
  };

  const handleSuggestionClick = (suggestedChord: SequenceItem) => {
    if (chordToReharmonize) {
      // Caso: Reemplazar un acorde existente
      chordToReharmonize.callback(suggestedChord);
    } else if (insertionContext) {
      // Caso: Insertar un acorde de paso
      const { lineIndex, charIndex } = insertionContext;
      const currentDocLines = currentSongDoc.split('\n');
      const targetLine = currentDocLines[lineIndex];

      if (targetLine !== undefined) {
        const newChordText = formatChordName(suggestedChord, { style: 'short' });
        const newLine = targetLine.slice(0, charIndex) + newChordText + ' ' + targetLine.slice(charIndex);
        currentDocLines[lineIndex] = newLine;
        setCurrentSongDoc(currentDocLines.join('\n'));
      }
    }
    setSuggestionModalVisible(false);
    setChordToReharmonize(null);
    setInsertionContext(null);
  };
  // --- Fin de las nuevas funciones ---


  const renderActiveMode = () => {
    if (!audioEngine) return <div>Cargando motor de audio...</div>;

    switch (activeMode) {
      case 'visualizer':
        return <VisualizerMode audioEngine={audioEngine} showInspector={showInspector} />;
      case 'editor':
        return <SongEditor 
                  initialDoc={currentSongDoc} 
                  audioEngine={audioEngine} 
                  showInspector={showInspector} 
                  onChordHover={setActiveChord} 
                  transpositionOffset={transpositionOffset}
                  onDocChange={setCurrentSongDoc}
                  onReharmonizeClick={handleReharmonizeClick}
                  onReharmonizeSpaceClick={handleReharmonizeSpaceClick}
               />;
      default:
        return <VisualizerMode audioEngine={audioEngine} showInspector={showInspector} />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-dark-main" onClick={handleFirstInteraction}>
      <Navbar activeMode={activeMode} onModeChange={setActiveMode} />

      {activeMode === 'editor' && (
        <>
          <div className="piano-header-container">
            <PianoDisplay chord={activeChord} transpositionOffset={transpositionOffset} />
          </div>
          <div className="transposition-controls-group">
            <button className="terminal-button" onClick={handleTransposeDown}>⯆</button>
            <div 
              ref={displayRef}
              className="terminal-button active"
            >
              Original
            </div>
            <button className="terminal-button" onClick={handleTransposeUp}>⯅</button>
            <button 
              className="terminal-button danger" 
              onClick={handleTransposeReset}
            >
              Reset
            </button>
            <button className="terminal-button" onClick={handleExport}>
              Exportar
            </button>
            <button className="terminal-button" onClick={handleImportClick}>
              Importar
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".chord,application/json"
              style={{ display: 'none' }}
            />
            {/* Selector de Tonalidad */}
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
          </div>
        </>
      )}

      <main className="main-content">
        {renderActiveMode()}
      </main>

      {audioEngine && (
        <ChordInspectorModal
          isVisible={inspectorVisible}
          onClose={() => setInspectorVisible(false)}
          item={inspectorItem}
          onSave={handleSaveInspector}
          onDelete={handleDeleteInspector}
          onInsert={handleInsertInspector}
          audioEngine={audioEngine}
          transpositionOffset={transpositionOffset}
        />
      )}

      {/* El modal de sugerencias ahora vive aquí */}
      <DraggableModal
        isVisible={isSuggestionModalVisible}
        onClose={() => setSuggestionModalVisible(false)}
        suggestions={suggestions}
        onSuggestionClick={handleSuggestionClick}
        activeChord={chordToReharmonize?.chord ?? null}
      />
    </div>
  );
}

export default App;
