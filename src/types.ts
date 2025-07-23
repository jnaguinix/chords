/**
 * Representa un acorde musical individual con todas sus propiedades.
 * - id: Un identificador único opcional para tracking en la UI.
 * - raw: La representación textual original del acorde (ej. "C#m7").
 */
export type SequenceItem = { 
    id?: number;
    raw?: string;
    rootNote: string;
    type: string;
    bassNote?: string;
    inversion?: number;
    alterations?: string[]; // <-- ¡CAMBIO! Añadido para manejar alteraciones como (#9), (b5), etc.
};

/**
 * Representa un acorde tal como aparece en una línea de la canción.
 * Contiene el acorde como un objeto y su posición.
 */
export type SongChord = { 
    chord: SequenceItem;
    position: number; 
    isAnnotation?: boolean; 
};

/**
 * Representa una línea completa de una canción, con su letra y los acordes asociados.
 */
export type SongLine = { 
    lyrics: string; 
    chords: SongChord[]; 
    isInstrumental?: boolean; 
};

/**
 * Representa la canción completa procesada, lista para ser usada en la aplicación.
 */
export type ProcessedSong = { 
    lines: SongLine[]; 
    allChords: SequenceItem[]; 
};

/**
 * Define los callbacks que el Chord Inspector puede recibir.
 * Todos son opcionales.
 */
export type InspectorCallbacks = {
    onUpdate?: (updatedItem: SequenceItem) => void;
    onDelete?: (itemToDelete: SequenceItem) => void;
    onInsert?: (item: SequenceItem) => void; 
};

/**
 * Define la firma de la función que abre el Chord Inspector.
 */
export type ShowInspectorFn = (item: SequenceItem, callbacks?: InspectorCallbacks) => void;
