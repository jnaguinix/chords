import { useState, useEffect, useCallback, useRef } from 'react';
import Navbar from './components/Navbar';
import type { AppMode } from './components/Navbar';
import VisualizerMode from './components/VisualizerMode';
import SongEditor from './components/SongEditor';
import ReharmonizerMode from './components/ReharmonizerMode';
import ChordInspectorModal from './components/ChordInspectorModal';
import PianoDisplay from './components/PianoDisplay';
import { AudioEngine, initAudio } from './utils/audio';
import { TranspositionManager } from './utils/transposition-manager'; // ✅ Importar TranspositionManager
import type { SequenceItem, ProcessedSong, InspectorCallbacks, ShowInspectorFn } from './types';
import './App.css';

const sampleSong = `
[Verso 1]
      Am          F      C               G 
Ejemplo de Cancioncita, solo debes añadir la letra de la cancion
  Am7          Fmaj7                   C/E       G/B
Y poner encima los acordes, no es nada complicado o si
`;

function App() {
  const [activeMode, setActiveMode] = useState<AppMode>('editor');
  const [audioEngine, setAudioEngine] = useState<AudioEngine | null>(null);
  const [isAudioInitialized, setIsAudioInitialized] = useState(false);
  
  const [inspectorVisible, setInspectorVisible] = useState(false);
  const [inspectorItem, setInspectorItem] = useState<SequenceItem | null>(null);
  const [inspectorCallbacks, setInspectorCallbacks] = useState<InspectorCallbacks>({});

  const [songForReharmonizer, setSongForReharmonizer] = useState<ProcessedSong | null>(null);
  const [activeChord, setActiveChord] = useState<SequenceItem | null>(null);
  const [transpositionOffset, setTranspositionOffset] = useState<number>(0);
  const [currentSongDoc, setCurrentSongDoc] = useState(sampleSong); // Nuevo estado para el contenido de la canción

  // ✅ Referencias para el TranspositionManager
  const displayRef = useRef<HTMLDivElement>(null);
  const transpositionManagerRef = useRef<TranspositionManager | null>(null);

  useEffect(() => {
    const engine = new AudioEngine();
    setAudioEngine(engine);
  }, []);

  // ✅ Inicializar TranspositionManager cuando el display esté disponible
  useEffect(() => {
    if (displayRef.current && !transpositionManagerRef.current && activeMode === 'editor') {
      transpositionManagerRef.current = new TranspositionManager(
        displayRef.current,
        () => {
          // Callback que sincroniza con React state
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

  const handleSendToReharmonizer = (song: ProcessedSong) => {
    setSongForReharmonizer(song);
    setActiveMode('reharmonizer');
  };

  // ✅ Usar TranspositionManager en lugar de state directo
  const handleTransposeUp = useCallback(() => {
    transpositionManagerRef.current?.up();
  }, []);

  const handleTransposeDown = useCallback(() => {
    transpositionManagerRef.current?.down();
  }, []);

  // ✅ Función para resetear (opcional)
  const handleTransposeReset = useCallback(() => {
    transpositionManagerRef.current?.reset();
  }, []);

  // Funciones para Exportar/Importar
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = useCallback(() => {
    const songData = {
      version: "1.0",
      metadata: {
        title: "Mi Canción Exportada",
        artist: "Desconocido",
        key: "C", // Puedes hacer esto dinámico si tienes la clave de la canción
        tempo: 120 // Puedes hacer esto dinámico si tienes el tempo
      },
      songContent: currentSongDoc
    };
    const jsonString = JSON.stringify(songData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mi_cancion.chord"; // Nombre del archivo con la extensión .chord
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [currentSongDoc]);

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
            console.log("App.tsx: Contenido de la canción importada:", songData.songContent);
            setCurrentSongDoc(songData.songContent);
            // Aquí podrías también actualizar metadatos si los tuvieras en el UI
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
                  onSendToReharmonizer={handleSendToReharmonizer}
                  onDocChange={setCurrentSongDoc} // Pasar la función para actualizar el documento
               />;
      case 'reharmonizer':
        return (
          <ReharmonizerMode
            song={songForReharmonizer}
            audioEngine={audioEngine}
            showInspector={showInspector}
          />
        );
      default:
        return <VisualizerMode audioEngine={audioEngine} showInspector={showInspector} />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-dark-main" onClick={handleFirstInteraction}>
      <Navbar activeMode={activeMode} onModeChange={setActiveMode} />

      {/* El piano y los controles de transposición solo se muestran en el modo editor */}
      {activeMode === 'editor' && (
        <>
          <div className="piano-header-container">
            <PianoDisplay chord={activeChord} transpositionOffset={transpositionOffset} />
          </div>
          {/* Controles de transposición con nuevo estilo Neón Terminal */}
          <div className="transposition-controls-group">
            <button className="terminal-button" onClick={handleTransposeDown}>⯆</button>
            <div 
              ref={displayRef}
              className="terminal-button active" // El display ahora parece un botón activo
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
    </div>
  );
}

export default App;