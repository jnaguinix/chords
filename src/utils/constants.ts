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
// El 'key' es el nombre interno canónico, y el 'value' es la fórmula de intervalos.
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
    'add(9)': [0, 4, 7, 14],
    'add(11)': [0, 4, 5, 7],
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
// Permite al parser entender diferentes formas de escribir un mismo acorde.
export const CHORD_TYPE_MAP: { [key: string]: string } = {
    // Ordenado de más específico a más general para evitar conflictos
    'm(maj7)': 'm(maj7)',
    'maj7': 'maj7', 'M7': 'maj7',
    'm7b5': 'ø7 (m7b5)', 'ø7': 'ø7 (m7b5)',
    'm7': 'm7',
    'dim7': '°7 (dim7)', '°7': '°7 (dim7)',
    '7sus4': '7sus4',
    '7sus2': '7sus2',
    '6/9': '6/9',
    'add11': 'add(11)', 'add4': 'add(11)',
    'add9': 'add(9)',
    'sus4': 'sus4', 'sus': 'sus4',
    'sus2': 'sus2',
    'dim': 'Disminuido', '°': 'Disminuido',
    'aug': 'Aumentado', '+': 'Aumentado',
    'm6': 'm6',
    '7': '7 (Dominante)',
    '6': '6',
    '5': '5 (Power Chord)',
    'm': 'Menor', 'min': 'Menor', '-': 'Menor',
    '': 'Mayor', 'M': 'Mayor',
    'maj9': 'maj9',
    'madd9': 'madd9',
    '7b9': '7b9',
    '7#9': '7#9',
    '9': '9',
    'm9': 'm9',
    '13': '13',
    'm11': 'm11',
    'maj7#11': 'maj7#11',
    '9sus4': '9sus4',
};

// --- LISTA PARA LA UI (MENÚS DESPLEGABLES) ---
// Define el texto que ve el usuario (símbolo) y el valor interno que usa la app.
export const CHORD_DISPLAY_LIST = [
  { text: 'Triadas', isSeparator: true, value: '' },
  { text: 'Mayor', value: 'Mayor' },
  { text: 'm', value: 'Menor' },
  { text: '5', value: '5 (Power Chord)' },
  { text: 'aug / +', value: 'Aumentado' },
  { text: 'dim / °', value: 'Disminuido' },

  { text: '7ªs', isSeparator: true, value: '' },
  { text: '7 (Dominante)', value: '7 (Dominante)' },
  { text: 'm7', value: 'm7' },
  { text: 'maj7', value: 'maj7' },
  { text: 'm(maj7)', value: 'm(maj7)' },
  { text: 'ø7 (m7b5)', value: 'ø7 (m7b5)' },
  { text: '°7 (dim7)', value: '°7 (dim7)' },

  { text: 'Add / 6', isSeparator: true, value: '' },
  { text: '6', value: '6' },
  { text: 'm6', value: 'm6' },
  { text: '6/9', value: '6/9' },
  { text: 'add(9)', value: 'add(9)' },
  { text: 'add(11)', value: 'add(11)' },

  { text: 'Sus', isSeparator: true, value: '' },
  { text: 'sus2', value: 'sus2' },
  { text: 'sus4', value: 'sus4' },
  { text: '7sus2', value: '7sus2' },
  { text: '7sus4', value: '7sus4' },

  { text: 'Ext.', isSeparator: true, value: '' },
  { text: 'maj9', value: 'maj9' },
  { text: 'madd9', value: 'madd9' },
  { text: '7b9', value: '7b9' },
  { text: '7#9', value: '7#9' },
  { text: '9', value: '9' },
  { text: 'm9', value: 'm9' },
  { text: '13', value: '13' },
  { text: 'm11', value: 'm11' },
  { text: 'maj7#11', value: 'maj7#11' },
  { text: '9sus4', value: '9sus4' },
];

// ANOTACIÓN: ¡NUEVOS DICCIONARIOS! Estos son la clave para la nueva funcionalidad.

// --- DICCIONARIO PARA NOMBRES DE NOTAS EN ESPAÑOL ---
export const NOTE_NAME_SPANISH: { [key: string]: string } = {
    'C': 'Do', 'C#': 'Do sostenido', 'Db': 'Re bemol',
    'D': 'Re', 'D#': 'Re sostenido', 'Eb': 'Mi bemol',
    'E': 'Mi', 'F': 'Fa', 'F#': 'Fa sostenido', 'Gb': 'Sol bemol',
    'G': 'Sol', 'G#': 'Sol sostenido', 'Ab': 'La bemol',
    'A': 'La', 'A#': 'La sostenido', 'Bb': 'Si bemol',
    'B': 'Si',
};

// --- DICCIONARIO PARA NOMBRES DESCRIPTIVOS DE ACORDES ---
// Mapea el nombre interno a su forma de lectura completa.
export const CHORD_TYPE_TO_READABLE_NAME: { [key: string]: string } = {
    'Major': 'Mayor',
    'Minor': 'menor',
    '5 (Power Chord)': '5',
    'Diminished': 'disminuido',
    'Augmented': 'aumentado',
    'sus2': 'suspendido 2',
    'sus4': 'suspendido 4',
    'maj7': 'Mayor séptima',
    'm7': 'menor séptima',
    '7 (Dominant)': 'séptima (Dominante)',
    '6': 'sexta',
    'm6': 'menor sexta',
    'ø7 (m7b5)': 'semidisminuido 7',
    '°7 (dim7)': 'disminuido 7',
    'm(maj7)': 'menor (con 7ma Mayor)',
    '6/9': 'sexta/novena',
    '7sus2': 'séptima sus2',
    '7sus4': 'séptima sus4',
    'add9': 'con novena añadida',
    'add11': 'con undécima añadida',
    'maj9': 'Mayor novena',
    'madd9': 'menor con novena añadida',
    '7b9': 'séptima con novena bemol',
    '7#9': 'séptima con novena sostenida',
    '9': 'novena',
    'm9': 'menor novena',
    '13': 'treceava',
    'm11': 'menor onceava',
    'maj7#11': 'mayor séptima con onceava sostenida',
    '9sus4': 'novena suspendida 4',
};
