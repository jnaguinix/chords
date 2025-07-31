import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AudioEngine } from '../utils/audio';
import { getChordNotes, calculateOptimalPianoRange, formatChordName } from '../utils/chord-utils';
import { createPiano, populateNoteSelector, populateChordTypeSelector } from '../utils/piano-renderer';
import { MUSICAL_INTERVALS, INDEX_TO_SHARP_NAME, INDEX_TO_FLAT_NAME, NOTE_TO_INDEX } from '../utils/constants';
import type { SequenceItem, ShowInspectorFn } from '../types';

const EDITABLE_ALTERATIONS = ['b5', '#5', 'b9', '#9', '#11', 'b13'];

interface VisualizerModeProps {
  audioEngine: AudioEngine;
  showInspector: ShowInspectorFn;
}

const VisualizerMode: React.FC<VisualizerModeProps> = ({ audioEngine, showInspector }) => {
  const [rootNote, setRootNote] = useState<string>('C');
  const [chordType, setChordType] = useState<string>('Mayor');
  const [bassNote, setBassNote] = useState<string | undefined>(undefined);
  const [inversion, setInversion] = useState<number>(0);
  const [alterations, setAlterations] = useState<string[]>([]);
  const [currentChord, setCurrentChord] = useState<SequenceItem>({ rootNote: 'C', type: 'Mayor' });

  const pianoContainerRef = useRef<HTMLDivElement>(null);
  const rootNoteSelectRef = useRef<HTMLSelectElement>(null);
  const chordTypeSelectRef = useRef<HTMLSelectElement>(null);
  const bassNoteSelectRef = useRef<HTMLSelectElement>(null);
  const inversionSelectRef = useRef<HTMLSelectElement>(null);

  // Se actualiza el objeto del acorde cada vez que cambia una de sus partes
  useEffect(() => {
    setCurrentChord({
      rootNote,
      type: chordType,
      bassNote: bassNote === 'none' ? undefined : bassNote,
      inversion,
      alterations,
    });
  }, [rootNote, chordType, bassNote, inversion, alterations]);

  const handlePlayChord = useCallback(async () => {
    audioEngine.playChord(currentChord);
  }, [currentChord, audioEngine]);

  // ========================================================================
  // CORRECCIÓN: Esta función ahora se usa en el JSX para abrir el inspector.
  // ========================================================================
  const handleChordNameClick = useCallback(() => {
    showInspector(currentChord, {
      onUpdate: (updatedItem) => {
        // Actualiza el visualizador con los cambios del inspector
        setRootNote(updatedItem.rootNote);
        setChordType(updatedItem.type);
        setBassNote(updatedItem.bassNote);
        setInversion(updatedItem.inversion || 0);
        setAlterations(updatedItem.alterations || []);
      }
    });
  }, [currentChord, showInspector]);

  useEffect(() => {
    if (pianoContainerRef.current) {
      const { notesToPress, bassNoteIndex, allNotesForRange } = getChordNotes(currentChord);

      if (allNotesForRange.length === 0) {
        pianoContainerRef.current.innerHTML = '';
      } else {
        const { startNote, endNote } = calculateOptimalPianoRange(allNotesForRange);
        createPiano(
          pianoContainerRef.current,
          startNote,
          endNote,
          notesToPress,
          false,
          bassNoteIndex,
          (noteIndex) => audioEngine?.playNote(noteIndex)
        );
      }
    }
  }, [currentChord, audioEngine]);

  useEffect(() => {
    const allNotes = [...new Set([...INDEX_TO_SHARP_NAME, ...INDEX_TO_FLAT_NAME])].sort((a, b) => NOTE_TO_INDEX[a] - NOTE_TO_INDEX[b] || a.localeCompare(b));
    if (rootNoteSelectRef.current) {
      populateNoteSelector(rootNoteSelectRef.current, allNotes);
      rootNoteSelectRef.current.value = rootNote;
    }
    if (bassNoteSelectRef.current) {
      populateNoteSelector(bassNoteSelectRef.current, allNotes, true);
      bassNoteSelectRef.current.value = bassNote || 'none';
    }
  }, [bassNote, rootNote]);

  useEffect(() => {
    if (chordTypeSelectRef.current) {
      populateChordTypeSelector(chordTypeSelectRef.current, rootNote, chordType);
      chordTypeSelectRef.current.value = chordType;
    }

    if (inversionSelectRef.current) {
      const selectedType = chordType;
      const intervals = MUSICAL_INTERVALS[selectedType];
      const numNotes = intervals ? intervals.length : 0;
      let currentInversion = inversion;

      inversionSelectRef.current.innerHTML = '';

      if (numNotes > 0) {
        for (let i = 0; i < numNotes; i++) {
          const option = document.createElement('option');
          option.value = i.toString();
          option.textContent = i === 0 ? 'Fundamental' : `${i}ª Inversión`;
          inversionSelectRef.current.appendChild(option);
        }
        if (currentInversion >= numNotes) {
          setInversion(0);
          currentInversion = 0;
        }
        inversionSelectRef.current.value = currentInversion.toString();
      }
    }
  }, [rootNote, chordType, inversion]);

  return (
    <>
      <div className="selector-panel">
        <div className="selector">
          <label className="selector-label" htmlFor="root-note-select">NOTA RAÍZ</label>
          <select id="root-note-select" className="selector-box" ref={rootNoteSelectRef} onChange={(e) => setRootNote(e.target.value)}></select>
        </div>
        <div className="selector">
          <label className="selector-label" htmlFor="chord-type-select">TIPO DE ACORDE</label>
          <select id="chord-type-select" className="selector-box" ref={chordTypeSelectRef} onChange={(e) => setChordType(e.target.value)}></select>
        </div>
        <div className="selector">
          <label className="selector-label" htmlFor="visualizer-bass-note-select">BAJO</label>
          <select id="visualizer-bass-note-select" className="selector-box" ref={bassNoteSelectRef} onChange={(e) => setBassNote(e.target.value === 'none' ? undefined : e.target.value)}></select>
        </div>
        <div className="selector">
          <label className="selector-label" htmlFor="visualizer-inversion-select">INVERSIÓN</label>
          <select id="visualizer-inversion-select" className="selector-box" ref={inversionSelectRef} onChange={(e) => setInversion(parseInt(e.target.value, 10))}></select>
        </div>
      </div>

      <div className="alteraciones">
        {EDITABLE_ALTERATIONS.map(alt => (
            <button 
                key={alt}
                className={`mod-button ${alterations.includes(alt) ? 'active' : ''}`}
                onClick={() => {
                    setAlterations(prev => 
                        prev.includes(alt) ? prev.filter(a => a !== alt) : [...prev, alt]
                    );
                }}
            >
                {alt}
            </button>
        ))}
        <button className="play-btn" aria-label="Reproducir acorde" onClick={handlePlayChord}>
            &#9654;
        </button>
      </div>

      {/* CORRECCIÓN: Se añade el evento onClick a este elemento */}
      <h2 className="chord-label" onClick={handleChordNameClick} style={{ cursor: 'pointer' }} title="Click para editar">
        {formatChordName(currentChord, { style: 'short' })}
      </h2>
      
      <div className="flex justify-center" ref={pianoContainerRef}>
        {/* El piano se renderiza aquí */}
      </div>
    </>
  );
};

export default VisualizerMode;
