import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AudioEngine, initAudio } from '../utils/audio';
import { getChordNotes, calculateOptimalPianoRange, formatChordName } from '../utils/chord-utils';
import { createPiano, populateNoteSelector, populateChordTypeSelector } from '../utils/piano-renderer';
import { MUSICAL_INTERVALS, INDEX_TO_SHARP_NAME, INDEX_TO_FLAT_NAME, NOTE_TO_INDEX } from '../utils/constants';
import type { SequenceItem } from '../types';

const EDITABLE_ALTERATIONS = ['b5', '#5', 'b9', '#9', '#11', 'b13'];

interface VisualizerModeProps {
  audioEngine: AudioEngine;
  isActive: boolean;
}

const VisualizerMode: React.FC<VisualizerModeProps> = ({ audioEngine, isActive }) => {
  const [rootNote, setRootNote] = useState<string>('C');
  const [chordType, setChordType] = useState<string>('Mayor');
  const [bassNote, setBassNote] = useState<string | undefined>(undefined);
  const [inversion, setInversion] = useState<number>(0);
  const [alterations, setAlterations] = useState<string[]>([]);
  const [chordNameDisplay, setChordNameDisplay] = useState<string>('');

  const pianoContainerRef = useRef<HTMLDivElement>(null);
  const rootNoteSelectRef = useRef<HTMLSelectElement>(null);
  const chordTypeSelectRef = useRef<HTMLSelectElement>(null);
  const bassNoteSelectRef = useRef<HTMLSelectElement>(null);
  const inversionSelectRef = useRef<HTMLSelectElement>(null);

  const handlePlayChord = useCallback(async () => {
    await initAudio();
    const currentChord: SequenceItem = {
      rootNote,
      type: chordType,
      bassNote: bassNote === 'none' ? undefined : bassNote,
      inversion,
      alterations,
    };
    audioEngine.playChord(currentChord);
  }, [rootNote, chordType, bassNote, inversion, alterations, audioEngine]);

  useEffect(() => {
    const currentChord: SequenceItem = {
      rootNote,
      type: chordType,
      bassNote: bassNote === 'none' ? undefined : bassNote,
      inversion,
      alterations,
    };
    
    // ========================================================================
    // MODIFICACIÓN: Cambiamos 'long' por 'short' para usar el cifrado.
    // ========================================================================
    setChordNameDisplay(formatChordName(currentChord, { style: 'short' }));

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
  }, [rootNote, chordType, bassNote, inversion, alterations, audioEngine]);

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
    <main className={`${isActive ? 'block' : 'hidden'}`}>
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

      <h2 className="chord-label">{chordNameDisplay}</h2>
      
      <div className="flex justify-center" ref={pianoContainerRef}>
        {/* El piano se renderiza aquí */}
      </div>
    </main>
  );
};

export default VisualizerMode;
