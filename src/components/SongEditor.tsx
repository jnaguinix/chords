import React, { useRef, useEffect, useCallback, useState } from 'react';
import { EditorView, ViewUpdate } from '@codemirror/view';
import { EditorState, StateEffect } from '@codemirror/state';
import { HighlightStyle, StreamLanguage, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { syntaxTree } from "@codemirror/language";
import type { AudioEngine } from '../utils/audio';
import type { ShowInspectorFn, SequenceItem, ProcessedSong } from '../types';
import { parseChordString, formatChordName, transposeNote } from '../utils/chord-utils';

const chordLineRegex = /^( *[A-G](b|#)?(m|maj|min|dim|aug|add|sus)?[0-9]?(\s*\([^)]*\))?(\/[A-G](b|#)?)? *)+$/i;

const chordLanguage = StreamLanguage.define({
  token(stream) {
    if (stream.sol() && !chordLineRegex.test(stream.string)) {
      stream.skipToEnd();
      return 'lyric';
    }
    if (stream.match(/[A-G](b|#)?[a-zA-Z0-9#b/()]*(\s*\([^)]*\))?(\/[A-G](b|#)?)?/)) {
      return 'chord';
    }
    stream.next();
    return null;
  },
  tokenTable: {
    chord: tags.keyword,
    lyric: tags.string,
  }
});

const chordHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, class: 'cm-chord' },
  { tag: tags.string, class: 'cm-lyric' },
]);

const editorTheme = EditorView.theme({
  '&': { fontSize: '32px', fontFamily: 'monospace', backgroundColor: '#1e1e1e', color: '#f8fafc', lineHeight: '1.1' },
  '.cm-content': { caretColor: 'green' },
  '&.cm-focused .cm-cursor': {
    backgroundColor: 'green',
    borderLeft: 'none',
    width: '1ch',
    mixBlendMode: 'difference',
  },
  '.cm-chord': { color: '#60a5fa', fontWeight: 'bold', cursor: 'pointer', padding: '0px 5px', borderRadius: '3px', '&:hover': { backgroundColor: '#27272a' }, fontSize: '0.86em' },
  '.cm-lyric': { color: '#f8fafc' },
});

// Función compartida para detectar acordes en una posición
const findChordAtPosition = (tree: any, pos: number, docLength: number) => {
  let chordNode = tree.resolveInner(pos, 1);
  
  // If the initial position doesn't land directly on a chord,
  // try checking nearby positions to find a chord node
  if (chordNode.type.name !== 'chord') {
    // Try positions to the left (up to 4 characters back)
    for (let offset = 1; offset <= 4 && pos - offset >= 0; offset++) {
      const testNode = tree.resolveInner(pos - offset, 1);
      if (testNode.type.name === 'chord') {
        // Verify the position is actually within the chord's visual bounds + extra margin
        if (pos <= testNode.to + 2) { // Added 2 characters margin to the right
          chordNode = testNode;
          break;
        }
      }
    }
    
    // If still not found, try positions to the right (up to 4 characters forward)
    if (chordNode.type.name !== 'chord') {
      for (let offset = 1; offset <= 4 && pos + offset < docLength; offset++) {
        const testNode = tree.resolveInner(pos + offset, 1);
        if (testNode.type.name === 'chord') {
          // Verify the position is actually within the chord's visual bounds + extra margin
          if (pos >= testNode.from - 2) { // Added 2 characters margin to the left
            chordNode = testNode;
            break;
          }
        }
      }
    }
  }
  
  return chordNode.type.name === 'chord' ? chordNode : null;
};

const chordInteractionPlugin = (audioEngine: AudioEngine, showInspector: ShowInspectorFn, transpositionOffset: number, longPressTimeoutRef: React.MutableRefObject<number | null>, clearLongPressTimeout: () => void, onChordHover: (chord: SequenceItem | null) => void) => {
  return EditorView.domEventHandlers({
    mousedown(event, view) {
      // Get the document position of the click
      const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
      if (pos === null) return; // Click was outside the editor content

      const tree = syntaxTree(view.state);
      const chordNode = findChordAtPosition(tree, pos, view.state.doc.length);

      // Check if we found a chord
      if (chordNode) {
        const originalChordText = view.state.sliceDoc(chordNode.from, chordNode.to);
        const parsedChord = parseChordString(originalChordText);

        if (parsedChord) {
          // Clear any existing timeout to prevent multiple triggers
          clearLongPressTimeout();

          const transposedChordForPlay = { ...parsedChord };
          if (transpositionOffset !== 0) {
            transposedChordForPlay.rootNote = transposeNote(transposedChordForPlay.rootNote, transpositionOffset);
            if (transposedChordForPlay.bassNote) {
              transposedChordForPlay.bassNote = transposeNote(transposedChordForPlay.bassNote, transpositionOffset);
            }
          }
          audioEngine.playChord(transposedChordForPlay);

          // Trigger onChordHover to update the piano display
          const transposedChordForDisplay = { ...parsedChord };
          if (transpositionOffset !== 0) {
            transposedChordForDisplay.rootNote = transposeNote(transposedChordForDisplay.rootNote, transpositionOffset);
            if (transposedChordForDisplay.bassNote) {
              transposedChordForDisplay.bassNote = transposeNote(transposedChordForDisplay.bassNote, transpositionOffset);
            }
          }
          onChordHover(transposedChordForDisplay);

          longPressTimeoutRef.current = window.setTimeout(() => {
            if (longPressTimeoutRef.current !== null) {
                longPressTimeoutRef.current = null;
                const itemToEdit = { ...parsedChord, id: Date.now() };
                if (transpositionOffset !== 0) {
                  itemToEdit.rootNote = transposeNote(itemToEdit.rootNote, transpositionOffset);
                  if (itemToEdit.bassNote) {
                    itemToEdit.bassNote = transposeNote(itemToEdit.bassNote, transpositionOffset);
                  }
                }
                showInspector(itemToEdit, {
                  onUpdate: (updatedTransposedItem: SequenceItem) => {
                    // Use the original chordNode's from/to for dispatching changes
                    const originalRootNote = transposeNote(updatedTransposedItem.rootNote, -transpositionOffset);
                    const originalBassNote = updatedTransposedItem.bassNote ? transposeNote(updatedTransposedItem.bassNote, -transpositionOffset) : undefined;
                    const originalUpdatedItem = { ...updatedTransposedItem, rootNote: originalRootNote, bassNote: originalBassNote };
                    const formatted = formatChordName(originalUpdatedItem, { style: 'short' });
                    view.dispatch({
                      changes: { from: chordNode.from, to: chordNode.to, insert: formatted }
                    });
                  },
                  onDelete: () => {
                    // Use the original chordNode's from/to for dispatching changes
                    view.dispatch({
                      changes: { from: chordNode.from, to: chordNode.to, insert: '' }
                    });
                  }
                });
            }
          }, 700);
        }
      }
    },
    mouseleave(_event, _view) {
      if (longPressTimeoutRef.current) {
        clearLongPressTimeout();
      }
      onChordHover(null);
    }
  });
};

const cursorChordDetector = (onChordHover: (chord: SequenceItem | null) => void, transpositionOffset: number) => {
  return EditorView.updateListener.of((update: ViewUpdate) => {
    if (!update.selectionSet) return;

    const pos = update.state.selection.main.head;
    const tree = syntaxTree(update.state);
    const chordNode = findChordAtPosition(tree, pos, update.state.doc.length);

    if (chordNode) {
      const originalChordText = update.state.sliceDoc(chordNode.from, chordNode.to);
      const parsedChord = parseChordString(originalChordText);
      if (parsedChord) {
        const transposedChord = { ...parsedChord };
        if (transpositionOffset !== 0) {
          transposedChord.rootNote = transposeNote(transposedChord.rootNote, transpositionOffset);
          if (transposedChord.bassNote) {
            transposedChord.bassNote = transposeNote(transposedChord.bassNote, transpositionOffset);
          }
        }
        onChordHover(transposedChord);
      } else {
        onChordHover(null);
      }
    } else {
      onChordHover(null);
    }
  });
};

interface SongEditorProps {
  initialDoc: string;
  audioEngine: AudioEngine;
  showInspector: ShowInspectorFn;
  onChordHover: (chord: SequenceItem | null) => void;
  transpositionOffset: number;
  onSendToReharmonizer: (song: ProcessedSong) => void;
  onDocChange: (doc: string) => void; // Nueva prop para notificar cambios en el documento
}

const SongEditor: React.FC<SongEditorProps> = ({ initialDoc, audioEngine, showInspector, onChordHover, transpositionOffset, onDocChange }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const longPressTimeoutRef = useRef<number | null>(null);
  const initializedRef = useRef<boolean>(false);

  // Internal state to hold the untransposed version of the song
  const [untransposedDoc, setUntransposedDoc] = useState(initialDoc);

  const clearLongPressTimeout = useCallback(() => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  }, []);

  // Effect to initialize the editor and untransposedDoc
  useEffect(() => {
    if (editorRef.current && !viewRef.current && !initializedRef.current) {
      const startState = EditorState.create({
        doc: initialDoc, // Initialize with initialDoc
        extensions: [
          chordLanguage,
          syntaxHighlighting(chordHighlightStyle),
          editorTheme,
          chordInteractionPlugin(audioEngine, showInspector, transpositionOffset, longPressTimeoutRef, clearLongPressTimeout, onChordHover),
          cursorChordDetector(onChordHover, transpositionOffset),
        ],
      });

      const view = new EditorView({ state: startState, parent: editorRef.current });
      viewRef.current = view;
      initializedRef.current = true;
    }

    return () => {
      if (!editorRef.current) {
        viewRef.current?.destroy();
        viewRef.current = null;
        initializedRef.current = false;
      }
    };
  }, [initialDoc]); // Depend on initialDoc for initial setup

  // Effect to handle changes in transpositionOffset
  useEffect(() => {
    if (viewRef.current && initializedRef.current) {
      let newDisplayedDoc = '';
      const lines = untransposedDoc.split('\n'); // Use the untransposed version

      newDisplayedDoc = lines.map(line => {
        if (chordLineRegex.test(line)) {
          let transposedLine = '';
          let lastIndex = 0;
          const matches = [...line.matchAll(/[A-G](b|#)?(m|maj|min|dim|aug|add|sus)?[0-9]?(\s*\([^)]*\))?(\/[A-G](b|#)?)?/g)];

          for (const match of matches) {
            const chordText = match[0];
            const startIndex = match.index;

            if (startIndex !== undefined) {
              transposedLine += line.substring(lastIndex, startIndex);
              lastIndex = startIndex + chordText.length;

              const parsedChord = parseChordString(chordText);
              if (parsedChord) {
                const transposedChord = { ...parsedChord };
                // Apply the absolute transposition offset to the untransposed chord
                transposedChord.rootNote = transposeNote(parsedChord.rootNote, transpositionOffset);
                if (parsedChord.bassNote) {
                  transposedChord.bassNote = transposeNote(parsedChord.bassNote, transpositionOffset);
                }
                transposedLine += formatChordName(transposedChord, { style: 'short' });
              } else {
                transposedLine += chordText;
              }
            }
          }
          transposedLine += line.substring(lastIndex);
          return transposedLine;
        }
        return line;
      }).join('\n');

      if (viewRef.current.state.doc.toString() !== newDisplayedDoc) {
        viewRef.current.dispatch({
          changes: { from: 0, to: viewRef.current.state.doc.length, insert: newDisplayedDoc }
        });
      }
    }
  }, [transpositionOffset, untransposedDoc, viewRef, initializedRef]); // Depend on untransposedDoc and transpositionOffset

  // Effect to update editor content when initialDoc prop changes (e.g., on import)
  useEffect(() => {
    if (viewRef.current && initializedRef.current) {
      const currentEditorDoc = viewRef.current.state.doc.toString();
      console.log("SongEditor.tsx: initialDoc recibido:", initialDoc);
      console.log("SongEditor.tsx: Contenido actual del editor:", currentEditorDoc);
      if (initialDoc !== currentEditorDoc) {
        console.log("SongEditor.tsx: Actualizando editor con nuevo initialDoc.");
        viewRef.current.dispatch({
          changes: { from: 0, to: currentEditorDoc.length, insert: initialDoc }
        });
        setUntransposedDoc(initialDoc); // Keep internal state in sync
      }
    }
  }, [initialDoc, viewRef, initializedRef]);

  // Manejar cambios en las props (excepto initialDoc) for extensions
  useEffect(() => {
    if (viewRef.current) {
      viewRef.current.dispatch({
        effects: StateEffect.reconfigure.of([
          chordLanguage,
          syntaxHighlighting(chordHighlightStyle),
          editorTheme,
          chordInteractionPlugin(audioEngine, showInspector, transpositionOffset, longPressTimeoutRef, clearLongPressTimeout, onChordHover),
          cursorChordDetector(onChordHover, transpositionOffset),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              const newDoc = update.state.doc.toString();
              setUntransposedDoc(newDoc);
              onDocChange(newDoc); // Notificar al componente padre sobre el cambio
            }
          }),
        ])
      });
    }
  }, [audioEngine, showInspector, onChordHover, transpositionOffset, clearLongPressTimeout, onDocChange]);

  // Event listener global para mouseup
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      clearLongPressTimeout();
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [clearLongPressTimeout]);

  return <div ref={editorRef} style={{ minHeight: '400px' }} />;
};

export default SongEditor;