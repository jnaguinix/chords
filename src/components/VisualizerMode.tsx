import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AudioEngine, initAudio } from '../utils/audio';
import { getChordNotes, calculateOptimalPianoRange, formatChordName } from '../utils/chord-utils';
import { createPiano, populateNoteSelector, populateChordTypeSelector } from '../utils/piano-renderer';
import { MUSICAL_INTERVALS, INDEX_TO_SHARP_NAME, INDEX_TO_FLAT_NAME, NOTE_TO_INDEX } from '../utils/constants';
import type { SequenceItem } from '../types';

const EDITABLE_ALTERATIONS = ['b5', '#5', 'b9', '#9', '#11', 'b13'];

interface VisualizerModeProps {
  audioEngine: AudioEngine;
  isActive: boolean; // Nueva prop
}

const VisualizerMode: React.FC<VisualizerModeProps> = ({ audioEngine, isActive }) => {
  const [rootNote, setRootNote] = useState<string>('C');
  const [chordType, setChordType] = useState<string>('Mayor');
  const [bassNote, setBassNote] = useState<string | undefined>(undefined);
  const [inversion, setInversion] = useState<number>(0);
  const [alterations, setAlterations] = useState<string[]>([]);
  const [chordNameDisplay, setChordNameDisplay] = useState<string>('');

  const pianoContainerRef = useRef<HTMLDivElement>(null);
  const modificationsEditorRef = useRef<HTMLDivElement>(null);
  const rootNoteSelectRef = useRef<HTMLSelectElement>(null);
  const chordTypeSelectRef = useRef<HTMLSelectElement>(null);
  const bassNoteSelectRef = useRef<HTMLSelectElement>(null);
  const inversionSelectRef = useRef<HTMLSelectElement>(null);

  // Function to handle playing the chord
  const handlePlayChord = useCallback(async () => {
    await initAudio(); // Ensure audio context is ready
    const currentChord: SequenceItem = {
      rootNote,
      type: chordType,
      bassNote: bassNote === 'none' ? undefined : bassNote,
      inversion,
      alterations,
    };
    audioEngine.playChord(currentChord);
  }, [rootNote, chordType, bassNote, inversion, alterations, audioEngine]);

  // Update currentChord and chordNameDisplay whenever relevant states change
  useEffect(() => {
    const currentChord: SequenceItem = {
      rootNote,
      type: chordType,
      bassNote: bassNote === 'none' ? undefined : bassNote,
      inversion,
      alterations,
    };
    setChordNameDisplay(formatChordName(currentChord, { style: 'long' }));

    // Update piano and modifications editor
    if (pianoContainerRef.current && modificationsEditorRef.current) {
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

      // Populate Modifications Editor
      modificationsEditorRef.current.innerHTML = '';
      EDITABLE_ALTERATIONS.forEach(alt => {
        const button = document.createElement('button');
        button.className = 'mod-button';
        button.textContent = alt;
        button.dataset.alt = alt;
        if (alterations.includes(alt)) {
          button.classList.add('selected');
        }
        button.onclick = () => {
          setAlterations(prevAlts => {
            const altIndex = prevAlts.indexOf(alt);
            if (altIndex > -1) {
              const newAlts = [...prevAlts];
              newAlts.splice(altIndex, 1);
              return newAlts;
            } else {
              return [...prevAlts, alt];
            }
          });
        };
        modificationsEditorRef.current?.appendChild(button);
      });
    }
  }, [rootNote, chordType, bassNote, inversion, alterations]);

  // Populate note selectors on initial render
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
  }, []);

  // Populate chord type selector and update inversion select when rootNote or chordType changes
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
          inversionSelectRef.current.value = '0';
        } else {
          inversionSelectRef.current.value = currentInversion.toString();
        }
      }
    }
  }, [rootNote, chordType, inversion]);

  return (
    <main id="visualizer-mode" className={`mode-content ${isActive ? 'active' : ''}`}>
      <div className="controls">
        <div className="select-wrapper">
          <label htmlFor="root-note-select">Nota Raíz</label>
          <select id="root-note-select" ref={rootNoteSelectRef} onChange={(e) => setRootNote(e.target.value)}></select>
        </div>
        <div className="select-wrapper">
          <label htmlFor="chord-type-select">Tipo de Acorde</label>
          <select id="chord-type-select" ref={chordTypeSelectRef} onChange={(e) => setChordType(e.target.value)}></select>
        </div>
        <div className="select-wrapper">
          <label htmlFor="visualizer-bass-note-select">Bajo</label>
          <select id="visualizer-bass-note-select" ref={bassNoteSelectRef} onChange={(e) => setBassNote(e.target.value)}></select>
        </div>
        <div className="select-wrapper">
          <label htmlFor="visualizer-inversion-select">Inversión</label>
          <select id="visualizer-inversion-select" ref={inversionSelectRef} onChange={(e) => setInversion(parseInt(e.target.value, 10))}></select>
        </div>
      </div>
      <div className="chord-display-header">
        <div className="modifications-and-play-container">
          <div id="visualizer-modifications-editor" className="modifications-container" ref={modificationsEditorRef}></div>
          <button id="visualizer-play-btn" className="play-btn" aria-label="Reproducir acorde" onClick={handlePlayChord}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" fill="currentColor"><path d="M73 39c-14.8-9.1-33.4-9.4-48.5-.9S0 62.6 0 80V432c0 17.4 9.4 33.4 24.5 41.9s33.7 8.1 48.5-.9L361 297c14.3-8.7 23-24.2 23-41s-8.7-32.2-23-41L73 39z"/></svg>
          </button>
        </div>
        <h2 id="chord-name">{chordNameDisplay}</h2>
      </div>
      <div id="piano-container" ref={pianoContainerRef}>
        <div className="piano" aria-label="Piano virtual">
        </div>
      </div>
    </main>
  );
};

export default VisualizerMode;