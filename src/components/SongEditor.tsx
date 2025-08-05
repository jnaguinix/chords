import React, { useRef, useEffect, useCallback, useState } from 'react';
import { EditorView, ViewUpdate } from '@codemirror/view';
import { EditorState, StateEffect } from '@codemirror/state';
import { HighlightStyle, StreamLanguage, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { syntaxTree } from "@codemirror/language";
import type { AudioEngine } from '../utils/audio';
import type { ShowInspectorFn, SequenceItem } from '../types';
import { parseChordString, formatChordName, transposeNote } from '../utils/chord-utils';

const chordTokenRegex = /[A-G](b|#)?[a-zA-Z0-9#b()¹²³⁴⁵⁶⁷⁸⁹]*(\/[A-G](b|#)?)?/;
const chordLineRegex = new RegExp(`^(\\s*${chordTokenRegex.source}\\s*)+$`);

const chordLanguage = StreamLanguage.define({
  token(stream) {
    if (stream.sol() && !chordLineRegex.test(stream.string)) {
      stream.skipToEnd();
      return 'lyric';
    }
    if (stream.match(chordTokenRegex)) {
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

// --- CAMBIO AQUÍ: Se corrige el error de tipo ---
const chordHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, class: 'cm-chord' },
  { tag: tags.string, class: 'cm-lyric' }, // Se usa tags.string en lugar de 'string'
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


const chordInteractionPlugin = (audioEngine: AudioEngine, showInspector: ShowInspectorFn, transpositionOffset: number, longPressTimeoutRef: React.MutableRefObject<number | null>, clearLongPressTimeout: () => void, onChordHover: (chord: SequenceItem | null) => void, onReharmonizeClick: (chord: SequenceItem, callback: (newChord: SequenceItem) => void) => void, onReharmonizeSpaceClick: (lineIndex: number, charIndex: number, prevChord: SequenceItem | null, nextChord: SequenceItem | null) => void) => {
  return EditorView.domEventHandlers({
    mousedown(event, view) {
      const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
      if (pos === null) return;

      const tree = syntaxTree(view.state);
      const chordNode = findChordAtPosition(tree, pos, view.state.doc.length);

      if (chordNode) {
        clearLongPressTimeout();
        
        const transposedChordText = view.state.sliceDoc(chordNode.from, chordNode.to);
        const parsedChord = parseChordString(transposedChordText);
        
        if (parsedChord) {
            onReharmonizeClick(parsedChord, (newChord) => {
              const formatted = formatChordName(newChord, { style: 'short' });
              view.dispatch({
                changes: { from: chordNode.from, to: chordNode.to, insert: formatted }
              });
            });
            audioEngine.playChord(parsedChord, 0); 
            onChordHover(parsedChord);
        } else {
            onChordHover(null);
        }

        longPressTimeoutRef.current = window.setTimeout(() => {
            if (longPressTimeoutRef.current !== null) {
                longPressTimeoutRef.current = null;
                
                const transposedChordText = view.state.sliceDoc(chordNode.from, chordNode.to);
                const parsedTransposedChord = parseChordString(transposedChordText);
                if (!parsedTransposedChord) return;
                
                const originalChord = { ...parsedTransposedChord, id: Date.now() };
                originalChord.rootNote = transposeNote(parsedTransposedChord.rootNote, -transpositionOffset);
                if (parsedTransposedChord.bassNote) {
                    originalChord.bassNote = transposeNote(parsedTransposedChord.bassNote, -transpositionOffset);
                }

                showInspector(originalChord, {
                  onUpdate: (updatedItem: SequenceItem) => {
                    const formatted = formatChordName(updatedItem, { style: 'short' });
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
      } else {
        // Click en un espacio vacío
        const line = view.state.doc.lineAt(pos);
        const lineIndex = line.number - 1; // Convertir a índice base 0
        const charIndex = pos - line.from;

        const lineChords: SequenceItem[] = [];
        syntaxTree(view.state).iterate({
          from: line.from,
          to: line.to,
          enter: (node) => {
            if (node.type.name === 'chord') {
              const chordText = view.state.sliceDoc(node.from, node.to);
              const parsedChord = parseChordString(chordText);
              if (parsedChord) {
                lineChords.push({ ...parsedChord, id: Date.now(), raw: chordText, position: node.from - line.from });
              }
            }
          }
        });

        const prevChord = lineChords.filter(c => c.position! < charIndex).pop() || null;
        const nextChord = lineChords.find(c => c.position! >= charIndex) || null;

        onReharmonizeSpaceClick(lineIndex, charIndex, prevChord, nextChord);
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

const cursorChordDetector = (onChordHover: (chord: SequenceItem | null) => void) => {
  return EditorView.updateListener.of((update: ViewUpdate) => {
    if (!update.selectionSet) return;

    const pos = update.state.selection.main.head;
    const tree = syntaxTree(update.state);
    const chordNode = findChordAtPosition(tree, pos, update.state.doc.length);

    if (chordNode) {
        const chordText = update.state.sliceDoc(chordNode.from, chordNode.to);
        const parsedChord = parseChordString(chordText);
        onChordHover(parsedChord);
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
  onDocChange: (doc: string) => void;
  onReharmonizeClick: (chord: SequenceItem, callback: (newChord: SequenceItem) => void) => void;
  onReharmonizeSpaceClick: (lineIndex: number, charIndex: number, prevChord: SequenceItem | null, nextChord: SequenceItem | null) => void;
}

const SongEditor: React.FC<SongEditorProps> = ({ initialDoc, audioEngine, showInspector, onChordHover, transpositionOffset, onDocChange, onReharmonizeClick, onReharmonizeSpaceClick }) => {
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
          chordInteractionPlugin(audioEngine, showInspector, transpositionOffset, longPressTimeoutRef, clearLongPressTimeout, onChordHover, onReharmonizeClick, onReharmonizeSpaceClick),
          cursorChordDetector(onChordHover),
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
        const lines = untransposedDoc.split('\n');

        const newDisplayedDoc = lines.map(line => {
            if (line.trim().match(/^[A-G]/)) {
                return line.replace(/\S+/g, (chordText) => {
                    const parsedChord = parseChordString(chordText);
                    if (parsedChord) {
                        return formatChordName(parsedChord, { style: 'short' }, transpositionOffset);
                    }
                    return chordText;
                });
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
      if (initialDoc !== currentEditorDoc && untransposedDoc !== initialDoc) {
        isProgrammaticChangeRef.current = true;
        viewRef.current.dispatch({
          changes: { from: 0, to: currentEditorDoc.length, insert: initialDoc }
        });
        isProgrammaticChangeRef.current = false;
        setUntransposedDoc(initialDoc);
      }
    }
  }, [initialDoc, untransposedDoc, viewRef, initializedRef]);

  useEffect(() => {
    if (viewRef.current) {
      viewRef.current.dispatch({
        effects: StateEffect.reconfigure.of([
          chordLanguage,
          syntaxHighlighting(chordHighlightStyle),
          editorTheme,
          chordInteractionPlugin(audioEngine, showInspector, transpositionOffset, longPressTimeoutRef, clearLongPressTimeout, onChordHover, onReharmonizeClick, onReharmonizeSpaceClick),
          cursorChordDetector(onChordHover),
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
