import { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import type { AppMode } from './components/Navbar';
import VisualizerMode from './components/VisualizerMode';
import ExtractorMode from './components/ExtractorMode';
import ComposerMode from './components/ComposerMode';
import ReharmonizerMode from './components/ReharmonizerMode';
import ChordInspectorModal from './components/ChordInspectorModal';
import { AudioEngine, initAudio } from './utils/audio';
import type { SequenceItem, ProcessedSong, InspectorCallbacks, ShowInspectorFn } from './types';
import './App.css';

function App() {
  const [activeMode, setActiveMode] = useState<AppMode>('visualizer');
  const [audioEngine, setAudioEngine] = useState<AudioEngine | null>(null);
  const [isAudioInitialized, setIsAudioInitialized] = useState(false);
  
  const [inspectorVisible, setInspectorVisible] = useState(false);
  const [inspectorItem, setInspectorItem] = useState<SequenceItem | null>(null);
  const [inspectorCallbacks, setInspectorCallbacks] = useState<InspectorCallbacks>({});

  const [songForComposer, setSongForComposer] = useState<ProcessedSong | null>(null);
  const [songForReharmonizer, setSongForReharmonizer] = useState<ProcessedSong | null>(null);

  useEffect(() => {
    const engine = new AudioEngine();
    setAudioEngine(engine);
  }, []);

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
    console.log("handleSendToReharmonizer called with song:", song);
    setSongForReharmonizer(song);
    setActiveMode('reharmonizer');
  };

  const renderActiveMode = () => {
    if (!audioEngine) return <div>Cargando motor de audio...</div>;

    switch (activeMode) {
      case 'visualizer':
        return <VisualizerMode audioEngine={audioEngine} showInspector={showInspector} />;
      case 'extractor':
        return (
          <ExtractorMode
            audioEngine={audioEngine}
            showInspector={showInspector}
            addToComposer={setSongForComposer}
            onModeChange={setActiveMode}
            onSendToReharmonizer={handleSendToReharmonizer}
          />
        );
      case 'composer':
        return (
          <ComposerMode
            initialSong={songForComposer}
            audioEngine={audioEngine}
            showInspector={showInspector}
            onSendToReharmonizer={handleSendToReharmonizer}
          />
        );
      case 'reharmonizer':
        // CORRECCIÓN: Se añaden las props 'audioEngine' y 'showInspector'
        // que faltaban para que el SheetManager funcione correctamente.
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
    <div className="app-container" onClick={handleFirstInteraction}>
      <Navbar activeMode={activeMode} onModeChange={setActiveMode} />
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
