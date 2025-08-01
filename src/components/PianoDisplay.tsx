import React, { useRef, useEffect } from 'react';
import type { SequenceItem } from '../types';
import { createPiano } from '../utils/piano-renderer';
import { getChordNotes, calculateOptimalPianoRange } from '../utils/chord-utils';

interface PianoDisplayProps {
  chord: SequenceItem | null;
  transpositionOffset: number; // Add transpositionOffset prop
}

const PianoDisplay: React.FC<PianoDisplayProps> = ({ chord, transpositionOffset }) => {
  const pianoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pianoRef.current) return;

    if (chord) {
      // Si hay un acorde, lo dibujamos con sus notas
      const { notesToPress, bassNoteIndex, allNotesForRange } = getChordNotes(chord, transpositionOffset); // Pass transpositionOffset
      if (allNotesForRange.length > 0) {
        const { startNote, endNote } = calculateOptimalPianoRange(allNotesForRange, 25, 4);
        createPiano(pianoRef.current, startNote, endNote, notesToPress, true, bassNoteIndex);
      } else {
        // Fallback por si el acorde es inválido: piano por defecto
        createPiano(pianoRef.current, 48, 72, [], true, null);
      }
    } else {
      // Si no hay acorde, dibujamos un piano por defecto, sin notas
      createPiano(pianoRef.current, 48, 72, [], true, null);
    }
  }, [chord, transpositionOffset]); // Add transpositionOffset to dependency array

  return (
    <div className="piano-display-container">
      <div ref={pianoRef} className="interactive-piano"></div>
    </div>
  );
};

export default PianoDisplay;