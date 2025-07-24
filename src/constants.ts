/*
================================================================================
|                              constants.ts                                    |
================================================================================
*/

export const SELECTOR_NOTES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

export const NOTE_TO_INDEX: { [key: string]: number } = {
    'C': 0, 'B#': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'Fb': 4,
    'F': 5, 'E#': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9,
    'A#': 10, 'Bb': 10, 'B': 11, 'Cb': 11,
};

export const INDEX_TO_SHARP_NAME = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const INDEX_TO_FLAT_NAME = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

export const IS_BLACK_KEY = [false, true, false, true, false, false, true, false, true, false, true, false];

// --- BASE DE DATOS DE INTERVALOS CON TODAS LAS ADICIONES ---
export const MUSICAL_INTERVALS: { [key: string]: number[] } = {
    // 1. Acordes Fundamentales
    'Mayor': [0, 4, 7],
    'Menor': [0, 3, 7],
    'Power Chord (5)': [0, 7],
    'Disminuido': [0, 3, 6],
    'Aumentado': [0, 4, 8],
    'Sus2': [0, 2, 7],
    'Sus4': [0, 5, 7],
    
    // 2. Séptimas y Sextas
    '7ma Mayor (Maj7)': [0, 4, 7, 11],
    '7ma Menor (m7)': [0, 3, 7, 10],
    '7ma Dominante (7)': [0, 4, 7, 10],
    '6ta Mayor (6)': [0, 4, 7, 9],
    '6ta Menor (m6)': [0, 3, 7, 9],
    '7ma Semidisminuida (m7b5)': [0, 3, 6, 10],
    '7ma Disminuida (dim7)': [0, 3, 6, 9],
    
    // --- NUEVOS ACORDES Y CASOS ESPECIALES ---
    'Menor con 7ma Mayor': [0, 3, 7, 11],
    '6ta/9na': [0, 4, 9, 14], // R, 3M, 6M, 9M (sin 5ta es común)
    '7ma Sus4 (7sus4)': [0, 5, 7, 10],
    '7ma Sus2 (7sus2)': [0, 2, 7, 10], // R, 2M, 5P, 7m
    'Add4': [0, 4, 5, 7], // R, 3M, 4P, 5P

    // 3. Extensiones y Add
    'Add9': [0, 4, 7, 14],
    'Add2': [0, 2, 4, 7],
    'Menor add9 (madd9)': [0, 3, 7, 14],
    '9na Mayor (Maj9)': [0, 4, 7, 11, 14],
    '9na Menor (m9)': [0, 3, 7, 10, 14],
    '9na Dominante (9)': [0, 4, 7, 10, 14],
    '9na Sus4 (9sus4)': [0, 5, 7, 10, 14], // R, 4P, 5P, 7m, 9M
    '11na (11)': [0, 7, 10, 14, 17], // Sin 3ra para evitar disonancia
    '13na (13)': [0, 4, 7, 10, 14, 21],
    'Menor 11na (m11)': [0, 3, 7, 10, 14, 17],
    'Mayor 13na (Maj13)': [0, 4, 7, 11, 14, 21],
};

// --- MAPA DE SUFIJOS CON ALIAS Y NUEVOS ACORDES ---
export const CHORD_TYPE_MAP: { [key: string]: string } = {
    // El orden es crucial: de más específico a más general
    'm(maj7)': 'Menor con 7ma Mayor',
    'maj13': 'Mayor 13na (Maj13)',
    'maj9': '9na Mayor (Maj9)',
    'maj7': '7ma Mayor (Maj7)',
    'm11': 'Menor 11na (m11)',
    'madd9': 'Menor add9 (madd9)',
    'm7b5': '7ma Semidisminuida (m7b5)',
    'm9': '9na Menor (m9)',
    'm7': '7ma Menor (m7)',
    'm6': '6ta Menor (m6)',
    // *** INICIO DE LA MODIFICACIÓN ***
    'º7': '7ma Disminuida (dim7)',   // Nuevo alias para dim7
    '°7': '7ma Disminuida (dim7)',   // Nuevo alias para dim7 (con símbolo de grado)
    'dim7': '7ma Disminuida (dim7)',
    'o7': '7ma Disminuida (dim7)',
    // *** FIN DE LA MODIFICACIÓN ***
    '6/9': '6ta/9na',
    '9sus4': '9na Sus4 (9sus4)',
    '7sus4': '7ma Sus4 (7sus4)',
    '7sus2': '7ma Sus2 (7sus2)',
    'add4': 'Add4',
    'add9': 'Add9',
    'add2': 'Add2',
    'sus4': 'Sus4',
    'sus2': 'Sus2',
    'sus': 'Sus4', // Alias para sus4
    // *** INICIO DE LA MODIFICACIÓN ***
    'dim': 'Disminuido',
    'º': 'Disminuido', // Nuevo alias para Disminuido
    '°': 'Disminuido', // Nuevo alias para Disminuido (con símbolo de grado)
    // *** FIN DE LA MODIFICACIÓN ***
    'aug': 'Aumentado',
    '+': 'Aumentado',
    '13': '13na (13)',
    '11': '11na (11)',
    '9': '9na Dominante (9)',
    '7': '7ma Dominante (7)',
    '6': '6ta Mayor (6)',
    '5': 'Power Chord (5)',
    'min': 'Menor', // Alias
    'm': 'Menor',
    '-': 'Menor', // Alias
    '': 'Mayor',
};

// --- MAPA INVERSO CON NUEVOS ACORDES ---
// **Nota:** El mapa inverso solo necesita un sufijo canónico por tipo de acorde.
// 'dim7' ya representa al tipo '7ma Disminuida (dim7)', por lo que aquí no son necesarios cambios,
// pero es bueno añadir el del disminuido simple.
export const CHORD_TYPE_TO_SUFFIX: { [key: string]: string } = {
    'Mayor': '',
    'Menor': 'm',
    'Power Chord (5)': '5',
    'Disminuido': 'dim', // 'dim' es el sufijo preferido, pero 'º' o '°' también funcionarían
    'Aumentado': '+',
    '7ma Mayor (Maj7)': 'maj7',
    '7ma Menor (m7)': 'm7',
    '7ma Dominante (7)': '7',
    '6ta Mayor (6)': '6',
    '6ta Menor (m6)': 'm6',
    'Sus2': 'sus2',
    'Sus4': 'sus4',
    '7ma Sus4 (7sus4)': '7sus4',
    '7ma Sus2 (7sus2)': '7sus2',
    '9na Sus4 (9sus4)': '9sus4',
    'Add4': 'add4',
    '7ma Semidisminuida (m7b5)': 'm7b5',
    '7ma Disminuida (dim7)': 'dim7', // 'dim7' es el sufijo preferido para la salida.
    'Menor con 7ma Mayor': 'm(maj7)',
    '6ta/9na': '6/9',
    'Add9': 'add9',
    'Add2': 'add2',
    'Menor add9 (madd9)': 'madd9',
    '9na Mayor (Maj9)': 'maj9',
    '9na Menor (m9)': 'm9',
    '9na Dominante (9)': '9',
    '11na (11)': '11',
    '13na (13)': '13',
    'Menor 11na (m11)': 'm11',
    'Mayor 13na (Maj13)': 'maj13',
};