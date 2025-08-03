/*
================================================================================
|                              constants.ts                                    |
|         (Versión final con nombres descriptivos y de UI)                     |
================================================================================
*/

export const NOTE_TO_INDEX: { [key: string]: number } = {
    'C': 0, 'B#': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'Fb': 4,
    'F': 5, 'E#': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9,
    'A#': 10, 'Bb': 10, 'B': 11, 'Cb': 11,
};

export const INDEX_TO_SHARP_NAME = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const INDEX_TO_FLAT_NAME = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

export const IS_BLACK_KEY = [false, true, false, true, false, false, true, false, true, false, true, false];

// --- FUENTE DE LA VERDAD (Lógica Interna) ---
export const MUSICAL_INTERVALS: { [key: string]: number[] } = {
    'Mayor': [0, 4, 7],
    'Menor': [0, 3, 7],
    '5 (Power Chord)': [0, 7],
    'Disminuido': [0, 3, 6],
    'Aumentado': [0, 4, 8],
    'sus2': [0, 2, 7],
    'sus4': [0, 5, 7],
    'maj7': [0, 4, 7, 11],
    'm7': [0, 3, 7, 10],
    '7 (Dominante)': [0, 4, 7, 10],
    '6': [0, 4, 7, 9],
    'm6': [0, 3, 7, 9],
    'ø7 (m7b5)': [0, 3, 6, 10],
    '°7 (dim7)': [0, 3, 6, 9],
    'm(maj7)': [0, 3, 7, 11],
    '6/9': [0, 4, 9, 14],
    '7sus4': [0, 5, 7, 10],
    '7sus2': [0, 2, 7, 10],
    'maj9': [0, 4, 7, 11, 14],
    'madd9': [0, 3, 7, 14],
    '7b9': [0, 4, 7, 10, 13],
    '7#9': [0, 4, 7, 10, 15],
    '9': [0, 4, 7, 10, 14],
    'm9': [0, 3, 7, 10, 14],
    '13': [0, 4, 7, 10, 14, 21],
    'm11': [0, 3, 7, 10, 14, 17],
    'maj7#11': [0, 4, 7, 11, 18],
    '9sus4': [0, 5, 7, 10, 14],
};

// --- MAPA DE ALIAS PARA EL PARSER ---
// MODIFICADO: Se elimina el alias 'sus': 'sus4' para evitar el bug de parsing prematuro.
export const CHORD_TYPE_MAP: { [key: string]: string } = {
    'm(maj7)': 'm(maj7)',
    'maj7#11': 'maj7#11',
    'maj7': 'maj7',
    'M7': 'maj7',
    'm7b5': 'ø7 (m7b5)',
    'ø7': 'ø7 (m7b5)',
    'm7': 'm7',
    'dim7': '°7 (dim7)',
    '°7': '°7 (dim7)',
    '7sus4': '7sus4',
    '7sus2': '7sus2',
    '6/9': '6/9',
    'sus4': 'sus4',
    'sus2': 'sus2',
    'dim': 'Disminuido',
    '°': 'Disminuido',
    'aug': 'Aumentado',
    '+': 'Aumentado',
    'm6': 'm6',
    '7': '7 (Dominante)',
    '6': '6',
    '5': '5 (Power Chord)',
    'maj9': 'maj9',
    'madd9': 'madd9',
    '7b9': '7b9',
    '7#9': '7#9',
    '9': '9',
    'm9': 'm9',
    '13': '13',
    'm11': 'm11',
    '9sus4': '9sus4',
    'm': 'Menor',
    'min': 'Menor',
    '-': 'Menor',
    '': 'Mayor',
    'M': 'Mayor',
};

// --- LISTA PARA LA UI (MENÚS DESPLEGABLES) ---
export const CHORD_DISPLAY_LIST = [
  { text: 'Tríadas', isSeparator: true, value: '' },
  { text: 'Mayor', value: 'Mayor' },
  { text: 'm', value: 'Menor' },
  { text: '5', value: '5 (Power Chord)' },
  { text: 'aug / +', value: 'Aumentado' },
  { text: 'dim / °', value: 'Disminuido' },

  { text: 'Sextas', isSeparator: true, value: '' },
  { text: '6', value: '6' },
  { text: 'm6', value: 'm6' },
  
  { text: 'Séptimas', isSeparator: true, value: '' },
  { text: '7 (Dominante)', value: '7 (Dominante)' },
  { text: 'm7', value: 'm7' },
  { text: 'maj7', value: 'maj7' },
  { text: 'm(maj7)', value: 'm(maj7)' },
  { text: '°7 (dim7)', value: '°7 (dim7)' },

  { text: 'Novenas', isSeparator: true, value: '' },
  { text: '9', value: '9' },
  { text: 'm9', value: 'm9' },
  { text: 'maj9', value: 'maj9' },
  
  { text: 'Otras Extensiones', isSeparator: true, value: '' },
  { text: '6/9', value: '6/9' },
  { text: 'm11', 'value': 'm11' },
  { text: '13', value: '13' },
  
  { text: 'Suspendidos', isSeparator: true, value: '' },
  { text: 'sus2', value: 'sus2' },
  { text: 'sus4', value: 'sus4' },
  { text: '7sus2', value: '7sus2' },
  { text: '7sus4', value: '7sus4' },
  { text: '9sus4', value: '9sus4' },
];

// --- DICCIONARIO PARA NOMBRES DE NOTAS EN ESPAÑOL ---
export const NOTE_NAME_SPANISH: { [key: string]: string } = { 'C': 'Do', 'C#': 'Do sostenido', 'Db': 'Re bemol', 'D': 'Re', 'D#': 'Re sostenido', 'Eb': 'Mi bemol', 'E': 'Mi', 'F': 'Fa', 'F#': 'Fa sostenido', 'Gb': 'Sol bemol', 'G': 'Sol', 'G#': 'Sol sostenido', 'Ab': 'La bemol', 'A': 'La', 'A#': 'La sostenido', 'Bb': 'Si bemol', 'B': 'Si' };

// --- DICCIONARIO PARA NOMBRES DESCRIPTIVOS DE ACORDES ---
export const CHORD_TYPE_TO_READABLE_NAME: { [key: string]: string } = { 'Mayor': 'Mayor', 'Menor': 'menor', '5 (Power Chord)': '5', 'Disminuido': 'disminuido', 'Aumentado': 'aumentado', 'sus2': 'suspendido 2', 'sus4': 'suspendido 4', 'maj7': 'Mayor séptima', 'm7': 'menor séptima', '7 (Dominante)': 'séptima (Dominante)', '6': 'sexta', 'm6': 'menor sexta', 'ø7 (m7b5)': 'semidisminuido 7', '°7 (dim7)': 'disminuido 7', 'm(maj7)': 'menor (con 7ma Mayor)', '6/9': 'sexta/novena', '7sus2': 'séptima sus2', '7sus4': 'séptima sus4', 'maj9': 'Mayor novena', 'madd9': 'menor con novena añadida', '7b9': 'séptima con novena bemol', '7#9': 'séptima con novena sostenida', '9': 'novena', 'm9': 'menor novena', '13': 'treceava', 'm11': 'menor onceava', 'maj7#11': 'mayor séptima con onceava sostenida', '9sus4': 'novena suspendida 4' };

// --- DICCIONARIO PARA SÍMBOLOS DE CIFRADO (Corto) ---
export const CHORD_TYPE_TO_SHORT_SYMBOL: { [key: string]: string } = {
    'Mayor': '', 'Menor': 'm', '5 (Power Chord)': '5', 'Disminuido': 'dim', 'Aumentado': 'aug', 'sus2': 'sus2', 'sus4': 'sus4', 'maj7': 'maj7', 'm7': 'm7', '7 (Dominante)': '7', '6': '6', 'm6': 'm6', 'ø7 (m7b5)': 'm7b5', '°7 (dim7)': 'dim7', 'm(maj7)': 'm(maj7)', '6/9': '6/9', '7sus4': '7sus4', '7sus2': '7sus2', 'maj9': 'maj9', 'madd9': 'madd9', '7b9': '7(b9)', '7#9': '7(#9)', '9': '9', 'm9': 'm9', '13': '13', 'm11': 'm11', 'maj7#11': 'maj7(#11)', '9sus4': '9sus4'
};
