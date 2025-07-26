import React, { useState, useEffect, useRef, useCallback } from 'react';
import { populateNoteSelector, populateChordTypeSelector, createPiano } from '../utils/piano-renderer';
import { getChordNotes, calculateOptimalPianoRange, formatChordName } from '../utils/chord-utils';
import { MUSICAL_INTERVALS, INDEX_TO_SHARP_NAME, INDEX_TO_FLAT_NAME, NOTE_TO_INDEX } from '../utils/constants';
import type { SequenceItem } from '../types';
import type { AudioEngine } from '../utils/audio';

const EDITABLE_ALTERATIONS = ['b5', '#5', 'b9', '#9', '#11', 'b13'];

interface ChordInspectorModalProps {
  isVisible: boolean;
  onClose: () => void;
  item: SequenceItem | null;
  onSave: (item: SequenceItem) => void;
  onInsert: (item: SequenceItem) => void;
  onDelete: (item: SequenceItem) => void;
  audioEngine: AudioEngine; // Pass AudioEngine as a prop
}

const ChordInspectorModal: React.FC<ChordInspectorModalProps> = ({ isVisible, onClose, item, onSave, onInsert, onDelete, audioEngine }) => {
  const [editedItem, setEditedItem] = useState<SequenceItem | null>(null);
  const [isNewChord, setIsNewChord] = useState<boolean>(false);

  const rootNoteSelectRef = useRef<HTMLSelectElement>(null);
  const chordTypeSelectRef = useRef<HTMLSelectElement>(null);
  const bassNoteSelectRef = useRef<HTMLSelectElement>(null);
  const inversionSelectRef = useRef<HTMLSelectElement>(null);
  const modificationsEditorRef = useRef<HTMLDivElement>(null);
  const chordInspectorPianoRef = useRef<HTMLDivElement>(null);

  // Initialize editedItem when item prop changes
  useEffect(() => {
    if (item) {
      setEditedItem(JSON.parse(JSON.stringify(item)));
      setIsNewChord(item.id === undefined);
    } else {
      setEditedItem(null);
      setIsNewChord(false);
    }
  }, [item]);

  // Populate selectors and render piano/modifications editor when editedItem changes
  useEffect(() => {
    if (!editedItem) return;

    const allNotes = [...new Set([...INDEX_TO_SHARP_NAME, ...INDEX_TO_FLAT_NAME])].sort((a, b) => NOTE_TO_INDEX[a] - NOTE_TO_INDEX[b] || a.localeCompare(b));

    if (rootNoteSelectRef.current) {
      populateNoteSelector(rootNoteSelectRef.current, allNotes);
      rootNoteSelectRef.current.value = editedItem.rootNote;
    }
    if (bassNoteSelectRef.current) {
      populateNoteSelector(bassNoteSelectRef.current, allNotes, true);
      bassNoteSelectRef.current.value = editedItem.bassNote || 'none';
    }
    if (chordTypeSelectRef.current) {
      populateChordTypeSelector(chordTypeSelectRef.current, editedItem.rootNote, editedItem.type);
      chordTypeSelectRef.current.value = editedItem.type;
    }

    // Update inversion select
    if (inversionSelectRef.current) {
      const selectedType = editedItem.type;
      const intervals = MUSICAL_INTERVALS[selectedType];
      const numNotes = intervals ? intervals.length : 0;
      let currentInversion = editedItem.inversion || 0;

      inversionSelectRef.current.innerHTML = '';

      if (numNotes > 0) {
        for (let i = 0; i < numNotes; i++) {
          const option = document.createElement('option');
          option.value = i.toString();
          option.textContent = i === 0 ? 'Fundamental' : `${i}ª Inversión`;
          inversionSelectRef.current.appendChild(option);
        }
        if (currentInversion >= numNotes) {
          currentInversion = 0; // Reset to fundamental if invalid
        }
        inversionSelectRef.current.value = currentInversion.toString();
      }
    }

    // Render piano
    if (chordInspectorPianoRef.current) {
      const { notesToPress, bassNoteIndex, allNotesForRange } = getChordNotes(editedItem);
      if (allNotesForRange.length > 0) {
        const { startNote, endNote } = calculateOptimalPianoRange(allNotesForRange, 15, 2);
        createPiano(chordInspectorPianoRef.current, startNote, endNote, notesToPress, true, bassNoteIndex);
      } else {
        chordInspectorPianoRef.current.innerHTML = '';
      }
    }

    // Populate Modifications Editor
    if (modificationsEditorRef.current) {
      modificationsEditorRef.current.innerHTML = '';
      EDITABLE_ALTERATIONS.forEach(alt => {
        const button = document.createElement('button');
        button.className = 'mod-button';
        button.textContent = alt;
        button.dataset.alt = alt;
        if (editedItem.alterations?.includes(alt)) {
          button.classList.add('selected');
        }
        button.onclick = () => {
          setEditedItem(prevItem => {
            if (!prevItem) return null;
            const newAlts = prevItem.alterations ? [...prevItem.alterations] : [];
            const altIndex = newAlts.indexOf(alt);
            if (altIndex > -1) {
              newAlts.splice(altIndex, 1);
            } else {
              newAlts.push(alt);
            }
            return { ...prevItem, alterations: newAlts };
          });
        };
        modificationsEditorRef.current?.appendChild(button);
      });
    }

  }, [editedItem]);

  const handleRootNoteChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setEditedItem(prevItem => {
      if (!prevItem) return null;
      const newRootNote = e.target.value;
      // Reset type and alterations if root note changes
      return { ...prevItem, rootNote: newRootNote, type: 'Mayor', alterations: [], inversion: 0 };
    });
  }, []);

  const handleChordTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setEditedItem(prevItem => {
      if (!prevItem) return null;
      // Reset alterations and inversion if chord type changes
      return { ...prevItem, type: e.target.value, alterations: [], inversion: 0 };
    });
  }, []);

  const handleBassNoteChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setEditedItem(prevItem => {
      if (!prevItem) return null;
      return { ...prevItem, bassNote: e.target.value === 'none' ? undefined : e.target.value };
    });
  }, []);

  const handleInversionChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setEditedItem(prevItem => {
      if (!prevItem) return null;
      return { ...prevItem, inversion: parseInt(e.target.value, 10) };
    });
  }, []);

  const handlePlayChord = useCallback(() => {
    if (editedItem) {
      audioEngine.playChord(editedItem);
    }
  }, [editedItem, audioEngine]);

  const handleSave = useCallback(() => {
    if (editedItem) {
      onSave(editedItem);
    }
  }, [editedItem, onSave]);

  const handleInsert = useCallback(() => {
    if (editedItem) {
      onInsert(editedItem);
    }
  }, [editedItem, onInsert]);

  const handleDelete = useCallback(() => {
    if (editedItem) {
      onDelete(editedItem);
    }
  }, [editedItem, onDelete]);

  if (!editedItem) return null; // Don't render if no item is provided

  return (
    <>
      <div id="chord-inspector-overlay" className={isVisible ? 'visible' : ''} onClick={onClose}></div>
      <div id="chord-inspector-modal" className={isVisible ? 'visible' : ''}>
        <div className="inspector-header">
          <h3 id="chord-inspector-title">{formatChordName(editedItem, { style: 'long' })}</h3>
          <button id="chord-inspector-play-btn" className="play-btn" onClick={handlePlayChord}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" fill="currentColor"><path d="M73 39c-14.8-9.1-33.4-9.4-48.5-.9S0 62.6 0 80V432c0 17.4 9.4 33.4 24.5 41.9s33.7 8.1 48.5-.9L361 297c14.3-8.7 23-24.2 23-41s-8.7-32.2-23-41L73 39z"/></svg>
          </button>
          <div className="inspector-actions">
            {!isNewChord && <button id="chord-inspector-save-btn" className="button-primary" onClick={handleSave}>Guardar</button>}
            {isNewChord && <button id="chord-inspector-insert-btn" className="button-primary" onClick={handleInsert}>Insertar</button>}
            {!isNewChord && <button id="chord-inspector-delete-btn" className="button-secondary" onClick={handleDelete}>Eliminar</button>}
          </div>
          <button id="chord-inspector-close-btn" onClick={onClose}>×</button>
        </div>

        <div className="inspector-controls">
          <div className="select-wrapper">
            <label htmlFor="chord-inspector-root-note-select">Nota Raíz</label>
            <select id="chord-inspector-root-note-select" ref={rootNoteSelectRef} onChange={handleRootNoteChange}></select>
          </div>
          <div className="select-wrapper">
            <label htmlFor="chord-inspector-type-select">Tipo de Acorde</label>
            <select id="chord-inspector-type-select" ref={chordTypeSelectRef} onChange={handleChordTypeChange}></select>
          </div>
          <div className="select-wrapper">
            <label htmlFor="chord-inspector-bass-note-select">Bajo en (Opcional)</label>
            <select id="chord-inspector-bass-note-select" ref={bassNoteSelectRef} onChange={handleBassNoteChange}></select>
          </div>
          <div className="select-wrapper">
            <label htmlFor="chord-inspector-inversion-select">Inversión</label>
            <select id="chord-inspector-inversion-select" ref={inversionSelectRef} onChange={handleInversionChange}></select>
          </div>
        </div>
        
        <div id="chord-inspector-modifications-editor" className="modifications-container" ref={modificationsEditorRef}></div>
        
        <div id="chord-inspector-piano" ref={chordInspectorPianoRef}></div>
      </div>
    </>
  );
};

export default ChordInspectorModal;