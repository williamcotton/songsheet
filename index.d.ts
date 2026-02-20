export interface Chord {
  root: string
  type: string
  bass?: string
  nashville?: boolean
  diamond?: boolean
  push?: boolean
  stop?: boolean
  splitMeasure?: Chord[]
}

export interface PositionedChord extends Chord {
  column: number
}

export interface Character {
  character: string
  chord?: Chord
  barLine?: true
}

export interface Line {
  chords: PositionedChord[]
  barLines: number[]
  lyrics: string
  characters: Character[]
}

export type Expression =
  | { type: 'section_ref'; name: string }
  | { type: 'chord_list'; chords: Chord[] }
  | { type: 'sequence'; items: Expression[] }
  | { type: 'repeat'; body: Expression; count: number }

export interface Section {
  count: number
  chords: Chord[]
  lyrics: string[]
  lines: Line[]
}

export interface StructureEntry {
  sectionType: string
  sectionIndex: number
  chords: Chord[]
  lyrics: string[]
  lines: Line[]
  expression: Expression | null
}

export interface TimeSignature {
  beats: number
  value: number
}

export interface Song {
  title: string
  author: string
  bpm: number | null
  timeSignature: TimeSignature | null
  key: string | null
  sections: Record<string, Section>
  structure: StructureEntry[]
}

export function parse(raw: string): Song
export function transpose(song: Song, semitones: number, options?: { preferFlats?: boolean }): Song
export function toNashville(song: Song, key: string): Song
export function toStandard(song: Song, key: string): Song
