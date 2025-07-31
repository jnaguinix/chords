import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { MouseEvent } from 'react';
import type { ChordSuggestion, SequenceItem } from '../types';
import { formatChordName } from '../utils/chord-utils';

interface DraggableModalProps {
  isVisible: boolean;
  onClose: () => void;
  suggestions: ChordSuggestion[];
  onSuggestionClick: (chord: SequenceItem) => void;
  activeChord: SequenceItem | null; 
}

const DraggableModal: React.FC<DraggableModalProps> = ({ isVisible, onClose, suggestions, onSuggestionClick, activeChord }) => {
  const [position, setPosition] = useState({ x: window.innerWidth / 2 - 200, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (modalRef.current) {
      setIsDragging(true);
      const rect = modalRef.current.getBoundingClientRect();
      offsetRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      e.preventDefault();
    }
  }, []);

  const handleMouseMove = useCallback((e: globalThis.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - offsetRef.current.x,
        y: e.clientY - offsetRef.current.y,
      });
    }
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.body.style.cursor = 'grabbing';
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      document.body.style.cursor = 'default';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Si no es visible, no renderizamos nada.
  if (!isVisible) {
    return null;
  }

  const title = activeChord 
    ? `Sugerencias para ${formatChordName(activeChord, { style: 'short' })}`
    : 'Sugerencias de Rearmonización';

  // Se elimina el div con la clase "modal-overlay".
  // Ahora el componente principal es el panel movible.
  return (
    <div
      ref={modalRef}
      className="draggable-modal font-fira"
      style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
      // Se elimina el stopPropagation para permitir que los clics pasen si es necesario,
      // aunque el panel en sí mismo capturará los clics sobre él.
    >
      <div 
        className="modal-header" 
        onMouseDown={handleMouseDown}
      >
        <h3 className="modal-title">{title}</h3>
        <button className="modal-close-btn" onClick={onClose}>×</button>
      </div>
      <div className="modal-content">
        <ul className="suggestions-list">
          {suggestions.length > 0 ? (
            suggestions.map((s, i) => (
              <li key={i} className="suggestion-item" onClick={() => onSuggestionClick(s.chord)}>
                <div>
                  <strong className="suggestion-chord">{formatChordName(s.chord, { style: 'short' })}</strong>
                  <span className="suggestion-technique">({s.technique})</span>
                </div>
                <p className="suggestion-justification">{s.justification}</p>
              </li>
            ))
          ) : (
            <p>No se encontraron sugerencias para este contexto.</p>
          )}
        </ul>
      </div>
    </div>
  );
};

export default DraggableModal;
