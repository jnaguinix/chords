export type SequenceItem = { rootNote: string, type: string, bassNote?: string, inversion?: number };
export type SongChord = { chord: string; position: number; isAnnotation?: boolean; };
export type SongLine = { lyrics: string; chords: SongChord[]; isInstrumental?: boolean; };
export type ProcessedSong = { lines: SongLine[]; allChords: SequenceItem[]; };