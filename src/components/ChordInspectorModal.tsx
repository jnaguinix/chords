import React, { useState, useEffect, useRef, useCallback } from 'react';
import { populateNoteSelector, populateChordTypeSelector, createPiano } from '../utils/piano-renderer';
import { getChordNotes, calculateOptimalPianoRange, formatChordName } from '../utils/chord-utils';
import { MUSICAL_INTERVALS, INDEX_TO_SHARP_NAME, INDEX_TO_FLAT_NAME, NOTE_TO_INDEX } from '../utils/constants';
import type { SequenceItem } from '../types';
import type { AudioEngine } from '../utils/audio';

const EDITABLE_ALTERATIONS = ['b5', '#5', 'b9', '#9', '#11', 'b13'];
const EDITABLE_ADDITIONS = ['add(9)', 'add(11)', 'add(6)']; // NUEVO: Additions editables

interface ChordInspectorModalProps {
  isVisible: boolean;
  onClose: () => void;
  item: SequenceItem | null;
  onSave: (item: SequenceItem) => void;
  onInsert: (item: SequenceItem) => void;
  onDelete: (item: SequenceItem) => void;
  audioEngine: AudioEngine;
}

const ChordInspectorModal: React.FC<ChordInspectorModalProps> = ({ isVisible, onClose, item, onSave, onInsert, onDelete, audioEngine }) => {
  const [editedItem, setEditedItem] = useState<SequenceItem | null>(null);
  const [isNewChord, setIsNewChord] = useState<boolean>(false);

  const rootNoteSelectRef = useRef<HTMLSelectElement>(null);
  const chordTypeSelectRef = useRef<HTMLSelectElement>(null);
  const bassNoteSelectRef = useRef<HTMLSelectElement>(null);
  const inversionSelectRef = useRef<HTMLSelectElement>(null);
  const modificationsEditorRef = useRef<HTMLDivElement>(null);
  const additionsEditorRef = useRef<HTMLDivElement>(null); // NUEVO: Ref para additions
  const chordInspectorPianoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (item) {
      setEditedItem(JSON.parse(JSON.stringify(item)));
      setIsNewChord(item.id === undefined);
    } else {
      setEditedItem(null);
      setIsNewChord(false);
    }
  }, [item]);

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
          currentInversion = 0;
        }
        inversionSelectRef.current.value = currentInversion.toString();
      }
    }

    if (chordInspectorPianoRef.current) {
      const { notesToPress, bassNoteIndex, allNotesForRange } = getChordNotes(editedItem);
      if (allNotesForRange.length > 0) {
        const { startNote, endNote } = calculateOptimalPianoRange(allNotesForRange, 15, 2);
        createPiano(chordInspectorPianoRef.current, startNote, endNote, notesToPress, true, bassNoteIndex);
      } else {
        chordInspectorPianoRef.current.innerHTML = '';
      }
    }

    // NUEVO: Editor de Additions
    if (additionsEditorRef.current) {
      additionsEditorRef.current.innerHTML = '';
      EDITABLE_ADDITIONS.forEach(add => {
        const button = document.createElement('button');
        button.className = 'mod-button addition-button'; // Clase específica para additions
        if (editedItem.additions?.includes(add)) {
          button.classList.add('active');
        }
        
        // Formatear el texto del botón para mostrar sin paréntesis
        const displayText = add.replace('add(', 'add').replace(')', '');
        button.textContent = displayText;
        
        button.onclick = () => {
          setEditedItem(prevItem => {
            if (!prevItem) return null;
            const newAdditions = prevItem.additions ? [...prevItem.additions] : [];
            const addIndex = newAdditions.indexOf(add);
            if (addIndex > -1) {
              newAdditions.splice(addIndex, 1);
            } else {
              newAdditions.push(add);
            }
            return { 
              ...prevItem, 
              additions: newAdditions.length > 0 ? newAdditions : undefined 
            };
          });
        };
        additionsEditorRef.current?.appendChild(button);
      });
    }

    // Editor de Alterations (existente)
    if (modificationsEditorRef.current) {
      modificationsEditorRef.current.innerHTML = '';
      EDITABLE_ALTERATIONS.forEach(alt => {
        const button = document.createElement('button');
        button.className = 'mod-button alteration-button'; // Clase específica para alterations
        if (editedItem.alterations?.includes(alt)) {
          button.classList.add('active');
        }
        button.textContent = alt;
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
            return { 
              ...prevItem, 
              alterations: newAlts.length > 0 ? newAlts : undefined 
            };
          });
        };
        modificationsEditorRef.current?.appendChild(button);
      });
    }

  }, [editedItem]);

  const handleRootNoteChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setEditedItem(p => p ? { 
      ...p, 
      rootNote: e.target.value, 
      type: 'Mayor', 
      alterations: undefined, // Limpiar alterations
      additions: undefined,   // Limpiar additions
      inversion: 0 
    } : null);
  }, []);

  const handleChordTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setEditedItem(p => p ? { 
      ...p, 
      type: e.target.value, 
      alterations: undefined, // Limpiar alterations
      additions: undefined,   // Limpiar additions
      inversion: 0 
    } : null);
  }, []);

  const handleBassNoteChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setEditedItem(p => p ? { 
      ...p, 
      bassNote: e.target.value === 'none' ? undefined : e.target.value 
    } : null);
  }, []);

  const handleInversionChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setEditedItem(p => p ? { 
      ...p, 
      inversion: parseInt(e.target.value, 10) 
    } : null);
  }, []);

  const handlePlayChord = useCallback(() => { 
    if (editedItem) audioEngine.playChord(editedItem); 
  }, [editedItem, audioEngine]);

  const handleSave = useCallback(() => { 
    if (editedItem) onSave(editedItem); 
  }, [editedItem, onSave]);

  const handleInsert = useCallback(() => { 
    if (editedItem) onInsert(editedItem); 
  }, [editedItem, onInsert]);

  const handleDelete = useCallback(() => { 
    if (editedItem) onDelete(editedItem); 
  }, [editedItem, onDelete]);

  if (!editedItem) return null;

  return (
    <>
      <div className={`chord-inspector-overlay ${isVisible ? 'visible' : ''}`} onClick={onClose}></div>
      <div className={`chord-inspector-modal ${isVisible ? 'visible' : ''}`}>
        <div className="inspector-header">
          <h3 className="text-xl font-medium text-light-main font-fira mr-auto">
            {formatChordName(editedItem, { style: 'short' })}
          </h3>
          <button className="play-btn-modal" onClick={handlePlayChord}>
            <svg className="w-4 h-4 ml-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" fill="currentColor">
              <path d="M73 39c-14.8-9.1-33.4-9.4-48.5-.9S0 62.6 0 80V432c0 17.4 9.4 33.4 24.5 41.9s33.7 8.1 48.5-.9L361 297c14.3-8.7 23-24.2 23-41s-8.7-32.2-23-41L73 39z"/>
            </svg>
          </button>
          <div className="flex gap-2.5">
            {!isNewChord && <button className="btn-primary-modal" onClick={handleSave}>Guardar</button>}
            {isNewChord && <button className="btn-primary-modal" onClick={handleInsert}>Insertar</button>}
            {!isNewChord && <button className="btn-delete-modal" onClick={handleDelete}>Eliminar</button>}
          </div>
          <button className="btn-close-modal" onClick={onClose}>×</button>
        </div>

        <div className="grid grid-cols-2 gap-5 mb-6">
          <div className="selector">
            <label className="selector-label">Nota Raíz</label>
            <select className="selector-box w-full" ref={rootNoteSelectRef} onChange={handleRootNoteChange}></select>
          </div>
          <div className="selector">
            <label className="selector-label">Tipo de Acorde</label>
            <select className="selector-box w-full" ref={chordTypeSelectRef} onChange={handleChordTypeChange}></select>
          </div>
          <div className="selector">
            <label className="selector-label">Bajo en (Opcional)</label>
            <select className="selector-box w-full" ref={bassNoteSelectRef} onChange={handleBassNoteChange}></select>
          </div>
          <div className="selector">
            <label className="selector-label">Inversión</label>
            <select className="selector-box w-full" ref={inversionSelectRef} onChange={handleInversionChange}></select>
          </div>
        </div>
        
        {/* NUEVO: Sección de Additions */}
        <div className="mb-4">
          <label className="selector-label block mb-2">Notas Añadidas</label>
          <div ref={additionsEditorRef} className="additions-editor flex flex-wrap gap-2"></div>
        </div>

        {/* Sección de Alterations (existente) */}
        <div className="mb-5">
          <label className="selector-label block mb-2">Alteraciones</label>
          <div ref={modificationsEditorRef} className="alteraciones flex flex-wrap gap-2"></div>
        </div>
        
        <div ref={chordInspectorPianoRef} className="flex justify-center inspector-piano-container"></div>
      </div>
    </>
  );
};

export default ChordInspectorModal;