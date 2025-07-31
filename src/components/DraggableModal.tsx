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
      className="draggable-modal font-fira bg-dark-light/90 text-light-main border border-brand-green/50 shadow-2xl shadow-brand-green-light/10 rounded-lg overflow-hidden backdrop-blur-sm"
      style={{ transform: `translate(${position.x}px, ${position.y}px)`, width: '400px' }}
    >
      <div 
        className="modal-header p-3 border-b border-grey/50 flex justify-center items-center cursor-grab active:cursor-grabbing relative" 
        onMouseDown={handleMouseDown}
      >
        <h3 
          className="modal-title font-bold text-lg"
          style={{ color: '#99ff33' }}
        >
            {title}
        </h3>
        <button 
            onClick={onClose} 
            className="bg-transparent border-none text-light-muted text-2xl cursor-pointer transition-colors hover:text-light-main p-1 rounded-full hover:bg-white/10 absolute top-1/2 right-3 transform -translate-y-1/2"
            aria-label="Cerrar modal"
        >
            ×
        </button>
      </div>
      <div className="modal-content p-4 max-h-80 overflow-y-auto">
        <ul className="suggestions-list space-y-2">
          {suggestions.length > 0 ? (
            suggestions.map((s, i) => (
              <li key={i} className="suggestion-item" onClick={() => onSuggestionClick(s.chord)}>
                <div>
                  <strong className="suggestion-chord">{formatChordName(s.chord, { style: 'short' })}</strong>
                  <span className="suggestion-technique ml-2 text-light-muted">({s.technique})</span>
                </div>
                <p className="suggestion-justification text-sm mt-1">{s.justification}</p>
              </li>
            ))
          ) : (
            <p className="text-light-muted text-center p-4">No se encontraron sugerencias para este contexto.</p>
          )}
        </ul>
      </div>
    </div>
  );
};

export default DraggableModal;
