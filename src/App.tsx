import { useState, useRef, useCallback, useEffect } from 'react';
import './App.css';
import Navbar from './components/Navbar';
import VisualizerMode from './components/VisualizerMode';
import ExtractorMode from './components/ExtractorMode';
import ComposerMode from './components/ComposerMode';
import ChordInspectorModal from './components/ChordInspectorModal';
import { AudioEngine, initAudio } from './utils/audio';
import type { ProcessedSong, SequenceItem, InspectorCallbacks, ShowInspectorFn } from './types';

function App() {
  const [activeMode, setActiveMode] = useState('visualizer');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [inspectorItem, setInspectorItem] = useState<SequenceItem | null>(null);
  const inspectorCallbacks = useRef<InspectorCallbacks | null>(null);

  const audioEngineRef = useRef<AudioEngine | null>(null);
  if (!audioEngineRef.current) {
    audioEngineRef.current = new AudioEngine();
  }

  // Initialize audio context on first user interaction
  useEffect(() => {
    const initializeAudio = async () => {
      await initAudio();
      document.body.removeEventListener('click', initializeAudio);
      document.body.removeEventListener('keydown', initializeAudio);
    };

    document.body.addEventListener('click', initializeAudio);
    document.body.addEventListener('keydown', initializeAudio);

    return () => {
      document.body.removeEventListener('click', initializeAudio);
      document.body.removeEventListener('keydown', initializeAudio);
    };
  }, []);

  const showInspector: ShowInspectorFn = useCallback((item, callbacks) => {
    setInspectorItem(item);
    inspectorCallbacks.current = callbacks || null;
    setIsModalVisible(true);
  }, []);

  const handleInspectorClose = useCallback(() => {
    setIsModalVisible(false);
    setInspectorItem(null);
    inspectorCallbacks.current = null;
  }, []);

  const handleInspectorSave = useCallback((updatedItem: SequenceItem) => {
    if (inspectorCallbacks.current?.onUpdate) {
      inspectorCallbacks.current.onUpdate(updatedItem);
    }
    handleInspectorClose();
  }, [handleInspectorClose]);

  const handleInspectorInsert = useCallback((itemToInsert: SequenceItem) => {
    if (inspectorCallbacks.current?.onInsert) {
      inspectorCallbacks.current.onInsert(itemToInsert);
    }
    handleInspectorClose();
  }, [handleInspectorClose]);

  const handleInspectorDelete = useCallback((itemToDelete: SequenceItem) => {
    if (inspectorCallbacks.current?.onDelete) {
      inspectorCallbacks.current.onDelete(itemToDelete);
    }
    handleInspectorClose();
  }, [handleInspectorClose]);

  const [composerSong, setComposerSong] = useState<ProcessedSong | null>(null);

  const addToComposer = useCallback((song: ProcessedSong) => {
    setComposerSong(song);
    setActiveMode('composer');
  }, []);

  return (
    <div id="app">
      <Navbar activeMode={activeMode} setActiveMode={setActiveMode} />

      {activeMode === 'visualizer' && <VisualizerMode audioEngine={audioEngineRef.current} isActive={activeMode === 'visualizer'} />}

      {activeMode === 'extractor' && <ExtractorMode audioEngine={audioEngineRef.current} showInspector={showInspector} addToComposer={addToComposer} isActive={activeMode === 'extractor'} />}

      {activeMode === 'composer' && <ComposerMode audioEngine={audioEngineRef.current} showInspector={showInspector} song={composerSong} isActive={activeMode === 'composer'} />}

      {/* Modal del Inspector de Acordes */}
      <ChordInspectorModal
        isVisible={isModalVisible}
        onClose={handleInspectorClose}
        item={inspectorItem}
        onSave={handleInspectorSave}
        onInsert={handleInspectorInsert}
        onDelete={handleInspectorDelete}
        audioEngine={audioEngineRef.current!}
      />
    </div>
  );
}

export default App;