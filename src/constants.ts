export const SELECTOR_NOTES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

export const NOTE_TO_INDEX: { [key: string]: number } = {
    'C': 0, 'B#': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'Fb': 4,
    'F': 5, 'E#': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9,
    'A#': 10, 'Bb': 10, 'B': 11, 'Cb': 11,
};

export const INDEX_TO_DISPLAY_NAME = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const IS_BLACK_KEY = [false, true, false, true, false, false, true, false, true, false, true, false];

// --- BASE DE DATOS DE INTERVALOS AMPLIADA ---
export const MUSICAL_INTERVALS: { [key: string]: number[] } = {
    // 1. Acordes Fundamentales y Power Chords
    'Mayor': [0, 4, 7],
    'Menor': [0, 3, 7],
    'Power Chord (5)': [0, 7], // <-- ¡NUEVO! Para F5, G5, etc.
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
    '7ma Disminuida (dim7)': [0, 3, 6, 9], // <-- ¡NUEVO! Acorde muy común

    // 3. Extensiones y Add
    'Add9': [0, 4, 7, 14],
    'Add2': [0, 2, 4, 7],
    'Menor add9 (madd9)': [0, 3, 7, 14],
    '9na Mayor (Maj9)': [0, 4, 7, 11, 14],
    '9na Menor (m9)': [0, 3, 7, 10, 14],
    '9na Dominante (9)': [0, 4, 7, 10, 14],
    '11na (11)': [0, 4, 7, 10, 14, 17],
    '13na (13)': [0, 4, 7, 10, 14, 21],
    'Menor 11na (m11)': [0, 3, 7, 10, 14, 17],
    'Mayor 13na (Maj13)': [0, 4, 7, 11, 14, 21],

    // 4. Dominantes Alterados
    '7ma Dominante (b9)': [0, 4, 7, 10, 13],
    '7ma Dominante (#9)': [0, 4, 7, 10, 15],
    '7ma Dominante (b5)': [0, 4, 6, 10],
    '7ma Dominante (#5)': [0, 4, 8, 10],
};

// --- MAPA DE SUFIJOS AMPLIADO ---
export const CHORD_TYPE_MAP: { [key: string]: string } = {
    // El orden es importante: de más específico a menos específico
    'maj13': 'Mayor 13na (Maj13)',
    'maj9': '9na Mayor (Maj9)',
    'maj7': '7ma Mayor (Maj7)',
    'm11': 'Menor 11na (m11)',
    'madd9': 'Menor add9 (madd9)',
    'm7b5': '7ma Semidisminuida (m7b5)',
    'm9': '9na Menor (m9)',
    'm7': '7ma Menor (m7)',
    'm6': '6ta Menor (m6)',
    'dim7': '7ma Disminuida (dim7)', // <-- ¡NUEVO!
    'o7': '7ma Disminuida (dim7)',   // <-- ¡NUEVO! Sinónimo
    'add9': 'Add9',
    'add2': 'Add2',
    'sus2': 'Sus2',
    'sus4': 'Sus4',
    'dim': 'Disminuido',
    '+5': 'Aumentado',
    '+': 'Aumentado',
    'aug': 'Aumentado',
    '7b9': '7ma Dominante (b9)',
    '7#9': '7ma Dominante (#9)',
    '7b5': '7ma Dominante (b5)',
    '7#5': '7ma Dominante (#5)',
    '13': '13na (13)',
    '11': '11na (11)',
    '9': '9na Dominante (9)',
    '7': '7ma Dominante (7)',
    '6': '6ta Mayor (6)',
    '5': 'Power Chord (5)', // <-- ¡NUEVO!
    'm': 'Menor',
    '': 'Mayor',
};

// --- MAPA INVERSO AMPLIADO ---
export const CHORD_TYPE_TO_SUFFIX: { [key: string]: string } = {
    'Mayor': '',
    'Menor': 'm',
    'Power Chord (5)': '5', // <-- ¡NUEVO!
    'Disminuido': 'dim',
    'Aumentado': '+',
    '7ma Mayor (Maj7)': 'maj7',
    '7ma Menor (m7)': 'm7',
    '7ma Dominante (7)': '7',
    '6ta Mayor (6)': '6',
    '6ta Menor (m6)': 'm6',
    'Sus2': 'sus2',
    'Sus4': 'sus4',
    '7ma Semidisminuida (m7b5)': 'm7b5',
    '7ma Disminuida (dim7)': 'dim7', // <-- ¡NUEVO!
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
    '7ma Dominante (b9)': '7b9',
    '7ma Dominante (#9)': '7#9',
    '7ma Dominante (b5)': '7b5',
    '7ma Dominante (#5)': '7#5',
};
