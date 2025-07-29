import { useState, useRef, useCallback, useEffect } from 'react';
// Importaciones de componentes con las rutas corregidas
import Navbar from './components/Navbar';
import VisualizerMode from './components/VisualizerMode';
import ExtractorMode from './components/ExtractorMode';
import ComposerMode from './components/ComposerMode';
import ChordInspectorModal from './components/ChordInspectorModal';

import { AudioEngine, initAudio } from './utils/audio';
import type { ProcessedSong, SequenceItem, InspectorCallbacks, ShowInspectorFn } from './types';

function App() {
  // Lógica de estado original del usuario
  const [activeMode, setActiveMode] = useState('visualizer');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [inspectorItem, setInspectorItem] = useState<SequenceItem | null>(null);
  const inspectorCallbacks = useRef<InspectorCallbacks | null>(null);
  const [composerSong, setComposerSong] = useState<ProcessedSong | null>(null);
  
  const audioEngineRef = useRef<AudioEngine | null>(null);
  if (!audioEngineRef.current) {
    audioEngineRef.current = new AudioEngine();
  }

  // Lógica de efectos original del usuario
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

  // Lógica de callbacks original del usuario
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
    inspectorCallbacks.current?.onUpdate?.(updatedItem);
    handleInspectorClose();
  }, [handleInspectorClose]);

  const handleInspectorInsert = useCallback((itemToInsert: SequenceItem) => {
    inspectorCallbacks.current?.onInsert?.(itemToInsert);
    handleInspectorClose();
  }, [handleInspectorClose]);

  const handleInspectorDelete = useCallback((itemToDelete: SequenceItem) => {
    inspectorCallbacks.current?.onDelete?.(itemToDelete);
    handleInspectorClose();
  }, [handleInspectorClose]);
  
  const addToComposer = useCallback((song: ProcessedSong) => {
    setComposerSong(song);
    setActiveMode('composer');
  }, []);

  return (
    // Estas clases restauran el fondo oscuro y el layout centrado
    <div className="bg-bg-main text-text-main font-victor min-h-screen w-full p-6 flex justify-center items-start">
      {/* Estas clases restauran el contenedor principal, reemplazando el #app de App.css */}
      <div className="w-[95%] max-w-[1400px] text-center p-8 bg-bg-card rounded-2xl shadow-lg">
        
        <Navbar activeMode={activeMode} setActiveMode={setActiveMode} />

        {/* Lógica de renderizado condicional original del usuario */}
        <VisualizerMode audioEngine={audioEngineRef.current} isActive={activeMode === 'visualizer'} />
        <ExtractorMode audioEngine={audioEngineRef.current} showInspector={showInspector} addToComposer={addToComposer} isActive={activeMode === 'extractor'} />
        <ComposerMode audioEngine={audioEngineRef.current} showInspector={showInspector} song={composerSong} isActive={activeMode === 'composer'} />

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
    </div>
  );
}

export default App;
