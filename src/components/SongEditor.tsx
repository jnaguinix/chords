import React, { useRef, useEffect, useCallback } from 'react';
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
    if (stream.match(/[A-G](b|#)?(m|maj|min|dim|aug|add|sus)?[0-9]?(\s*\([^)]*\))?(\/[A-G](b|#)?)?/)) {
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
  '&': { fontSize: '22px', fontFamily: 'monospace', backgroundColor: '#34495e', color: '#f8fafc' },
  '.cm-chord': { color: '#60a5fa', fontWeight: 'bold', cursor: 'pointer', padding: '2px 5px', borderRadius: '3px', '&:hover': { backgroundColor: '#27272a' }, fontSize: '1.2em' },
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
}

const SongEditor: React.FC<SongEditorProps> = ({ initialDoc, audioEngine, showInspector, onChordHover, transpositionOffset }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const longPressTimeoutRef = useRef<number | null>(null);
  const initializedRef = useRef<boolean>(false);

  const clearLongPressTimeout = useCallback(() => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  }, []);

  // Crear el editor solo una vez
  useEffect(() => {
    if (editorRef.current && !viewRef.current && !initializedRef.current) {
      const startState = EditorState.create({
        doc: initialDoc,
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

    // Cleanup solo cuando el componente se desmonte completamente
    return () => {
      if (!editorRef.current) {
        viewRef.current?.destroy();
        viewRef.current = null;
        initializedRef.current = false;
      }
    };
  }, []); // ✅ Solo se ejecuta una vez

  // Manejar cambios en las props (excepto initialDoc)
  useEffect(() => {
    if (viewRef.current) {
      viewRef.current.dispatch({
        effects: StateEffect.reconfigure.of([
          chordLanguage,
          syntaxHighlighting(chordHighlightStyle),
          editorTheme,
          chordInteractionPlugin(audioEngine, showInspector, transpositionOffset, longPressTimeoutRef, clearLongPressTimeout, onChordHover),
          cursorChordDetector(onChordHover, transpositionOffset),
        ])
      });
    }
  }, [audioEngine, showInspector, onChordHover, transpositionOffset, clearLongPressTimeout]);

  // Manejar cambios en initialDoc sin destruir el editor
  useEffect(() => {
    if (viewRef.current && initializedRef.current) {
      const currentDoc = viewRef.current.state.doc.toString();
      if (currentDoc !== initialDoc) {
        viewRef.current.dispatch({
          changes: { from: 0, to: viewRef.current.state.doc.length, insert: initialDoc }
        });
      }
    }
  }, [initialDoc]);

  // Event listener global para mouseup
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      clearLongPressTimeout();
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [clearLongPressTimeout]);

  return <div ref={editorRef} style={{ border: '1px solid #ccc', minHeight: '400px' }} />;
};

export default SongEditor;