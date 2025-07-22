export const SELECTOR_NOTES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

export const NOTE_TO_INDEX: { [key: string]: number } = {
    'C': 0, 'B#': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'Fb': 4,
    'F': 5, 'E#': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9,
    'A#': 10, 'Bb': 10, 'B': 11, 'Cb': 11,
};

export const INDEX_TO_DISPLAY_NAME = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const IS_BLACK_KEY = [false, true, false, true, false, false, true, false, true, false, true, false];

export const MUSICAL_INTERVALS: { [key: string]: number[] } = {
    'Mayor': [0, 4, 7],
    'Menor': [0, 3, 7],
    'Disminuido': [0, 3, 6],
    'Aumentado': [0, 4, 8],
    '7ma Mayor (Maj7)': [0, 4, 7, 11],
    '7ma Menor (m7)': [0, 3, 7, 10],
    '7ma Dominante (7)': [0, 4, 7, 10],
    '6ta Mayor (6)': [0, 4, 7, 9],
    '6ta Menor (m6)': [0, 3, 7, 9],
    'Sus2': [0, 2, 7],
    'Sus4': [0, 5, 7],
    '7ma Semidisminuida (m7b5)': [0, 3, 6, 10],
    '9na Mayor (Maj9)': [0, 4, 7, 11, 14],
    '9na Menor (m9)': [0, 3, 7, 10, 14],
    '9na Dominante (9)': [0, 4, 7, 10, 14],
    'Add9': [0, 4, 7, 14],
    'Menor add9 (madd9)': [0, 3, 7, 14],
};

export const CHORD_TYPE_MAP: { [key: string]: string } = {
    'maj7': '7ma Mayor (Maj7)', 'maj9': '9na Mayor (Maj9)', 'm7b5': '7ma Semidisminuida (m7b5)',
    'm9': '9na Menor (m9)', 'm7': '7ma Menor (m7)', 'm6': '6ta Menor (m6)',
    'madd9': 'Menor add9 (madd9)', 'm': 'Menor', 'sus2': 'Sus2', 'sus4': 'Sus4',
    'add9': 'Add9', 'dim': 'Disminuido', 'aug': 'Aumentado', '9': '9na Dominante (9)',
    '7': '7ma Dominante (7)', '6': '6ta Mayor (6)',
};