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
[Verse 1]
      C           G
This is a sample song
      Am          F
With some chords to play along
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

  const renderActiveMode = () => {
    if (!audioEngine) return <div>Cargando motor de audio...</div>;

    switch (activeMode) {
      case 'visualizer':
        return <VisualizerMode audioEngine={audioEngine} showInspector={showInspector} />;
      case 'editor':
        return <SongEditor 
                  initialDoc={sampleSong} 
                  audioEngine={audioEngine} 
                  showInspector={showInspector} 
                  onChordHover={setActiveChord} 
                  transpositionOffset={transpositionOffset}
                  onSendToReharmonizer={handleSendToReharmonizer}
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
    <div className={`${activeMode === 'editor' ? 'app-container-editor' : 'app-container'} bg-dark-main`} onClick={handleFirstInteraction}>
      <Navbar activeMode={activeMode} onModeChange={setActiveMode} />

      {/* El piano y los controles de transposición solo se muestran en el modo editor */}
      {activeMode === 'editor' && (
        <>
          <div className="piano-header-container">
            <PianoDisplay chord={activeChord} transpositionOffset={transpositionOffset} />
          </div>
          {/* ✅ Controles de transposición con TranspositionManager */}
          <div className="transposition-controls-group mb-4">
            <button className="btn-control" onClick={handleTransposeDown}>-</button>
            {/* ✅ El display ahora usa ref para conectar con TranspositionManager */}
            <div 
              ref={displayRef}
              className="transposition-display-segment"
            >
              Original
            </div>
            <button className="btn-control" onClick={handleTransposeUp}>+</button>
            {/* ✅ Botón de reset opcional */}
            <button 
              className="btn-control reset-btn" 
              onClick={handleTransposeReset}
              style={{ marginLeft: '10px', fontSize: '12px' }}
            >
              Reset
            </button>
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
        />
      )}
    </div>
  );
}

export default App;