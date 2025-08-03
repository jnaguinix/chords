import React, { useRef, useEffect, useCallback, useState } from 'react';
import { EditorView, ViewUpdate } from '@codemirror/view';
import { EditorState, StateEffect } from '@codemirror/state';
import { HighlightStyle, StreamLanguage, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { syntaxTree } from "@codemirror/language";
import type { AudioEngine } from '../utils/audio';
import type { ShowInspectorFn, SequenceItem, ProcessedSong } from '../types';
import { parseChordString, formatChordName, transposeNote } from '../utils/chord-utils';

// --- Esta es la versión estable y correcta, basada en tu código ---
const chordTokenRegex = /[A-G](b|#)?[a-zA-Z0-9#b()¹²³⁴⁵⁶⁷⁸⁹]*(\/[A-G](b|#)?)?/;
const chordLineRegex = new RegExp(`^(\\s*${chordTokenRegex.source}\\s*)+$`);

const chordLanguage = StreamLanguage.define({
  token(stream) {
    // Primero, se comprueba si la línea completa parece una línea de acordes. Si no, es letra.
    if (stream.sol() && !chordLineRegex.test(stream.string)) {
      stream.skipToEnd();
      return 'lyric';
    }
    // Si es una línea de acordes, se busca el siguiente token que coincida con la regex.
    if (stream.match(chordTokenRegex)) {
      return 'chord';
    }
    // Si no coincide, avanza al siguiente carácter.
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
  
  if (chordNode.type.name !== 'chord') {
    for (let offset = 1; offset <= 4 && pos - offset >= 0; offset++) {
      const testNode = tree.resolveInner(pos - offset, 1);
      if (testNode.type.name === 'chord') {
        if (pos <= testNode.to + 2) {
          chordNode = testNode;
          break;
        }
      }
    }
    
    if (chordNode.type.name !== 'chord') {
      for (let offset = 1; offset <= 4 && pos + offset < docLength; offset++) {
        const testNode = tree.resolveInner(pos + offset, 1);
        if (testNode.type.name === 'chord') {
          if (pos >= testNode.from - 2) {
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
      const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
      if (pos === null) return;

      const tree = syntaxTree(view.state);
      const chordNode = findChordAtPosition(tree, pos, view.state.doc.length);

      if (chordNode) {
        const originalChordText = view.state.sliceDoc(chordNode.from, chordNode.to);
        const parsedChord = parseChordString(originalChordText);

        if (parsedChord) {
          clearLongPressTimeout();

          const transposedChordForPlay = { ...parsedChord };
          if (transpositionOffset !== 0) {
            transposedChordForPlay.rootNote = transposeNote(transposedChordForPlay.rootNote, transpositionOffset);
            if (transposedChordForPlay.bassNote) {
              transposedChordForPlay.bassNote = transposeNote(transposedChordForPlay.bassNote, transpositionOffset);
            }
          }
          audioEngine.playChord(transposedChordForPlay);

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
                  itemToEdit.rootNote = transposeNote(itemToEdit.rootNote, -transpositionOffset);
                  if (itemToEdit.bassNote) {
                    itemToEdit.bassNote = transposeNote(itemToEdit.bassNote, -transpositionOffset);
                  }
                }
                showInspector(itemToEdit, {
                  onUpdate: (updatedTransposedItem: SequenceItem) => {
                    const originalRootNote = transposeNote(updatedTransposedItem.rootNote, -transpositionOffset);
                    const originalBassNote = updatedTransposedItem.bassNote ? transposeNote(updatedTransposedItem.bassNote, -transpositionOffset) : undefined;
                    const originalUpdatedItem = { ...updatedTransposedItem, rootNote: originalRootNote, bassNote: originalBassNote };
                    const formatted = formatChordName(originalUpdatedItem, { style: 'short' });
                    view.dispatch({
                      changes: { from: chordNode.from, to: chordNode.to, insert: formatted }
                    });
                  },
                  onDelete: () => {
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
  onDocChange: (doc: string) => void;
}

const SongEditor: React.FC<SongEditorProps> = ({ initialDoc, audioEngine, showInspector, onChordHover, transpositionOffset, onDocChange }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const longPressTimeoutRef = useRef<number | null>(null);
  const initializedRef = useRef<boolean>(false);
  const isProgrammaticChangeRef = useRef(false);

  const [untransposedDoc, setUntransposedDoc] = useState(initialDoc);

  const clearLongPressTimeout = useCallback(() => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  }, []);

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

    return () => {
      if (!editorRef.current) {
        viewRef.current?.destroy();
        viewRef.current = null;
        initializedRef.current = false;
      }
    };
  }, [initialDoc]);

  useEffect(() => {
    if (viewRef.current && initializedRef.current) {
      let newDisplayedDoc = '';
      const lines = untransposedDoc.split('\n');

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
        isProgrammaticChangeRef.current = true;
        viewRef.current.dispatch({
          changes: { from: 0, to: viewRef.current.state.doc.length, insert: newDisplayedDoc }
        });
        isProgrammaticChangeRef.current = false;
      }
    }
  }, [transpositionOffset, untransposedDoc, viewRef, initializedRef]);

  useEffect(() => {
    if (viewRef.current && initializedRef.current) {
      const currentEditorDoc = viewRef.current.state.doc.toString();
      if (initialDoc !== currentEditorDoc) {
        isProgrammaticChangeRef.current = true;
        viewRef.current.dispatch({
          changes: { from: 0, to: currentEditorDoc.length, insert: initialDoc }
        });
        isProgrammaticChangeRef.current = false;
        setUntransposedDoc(initialDoc);
      }
    }
  }, [initialDoc, viewRef, initializedRef]);

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
            if (update.docChanged && !isProgrammaticChangeRef.current) {
              const newDoc = update.state.doc.toString();
              setUntransposedDoc(newDoc);
              onDocChange(newDoc);
            }
          }),
        ])
      });
    }
  }, [audioEngine, showInspector, onChordHover, transpositionOffset, clearLongPressTimeout, onDocChange]);

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
