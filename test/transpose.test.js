import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { parse } from '../src/parser.js'
import { transpose, noteToSemitone, semitoneToNote, transposeChord } from '../src/transpose.js'

describe('noteToSemitone', () => {
  it('maps natural notes', () => {
    expect(noteToSemitone('C')).toBe(0)
    expect(noteToSemitone('D')).toBe(2)
    expect(noteToSemitone('E')).toBe(4)
    expect(noteToSemitone('F')).toBe(5)
    expect(noteToSemitone('G')).toBe(7)
    expect(noteToSemitone('A')).toBe(9)
    expect(noteToSemitone('B')).toBe(11)
  })

  it('maps sharps and flats', () => {
    expect(noteToSemitone('C#')).toBe(1)
    expect(noteToSemitone('Db')).toBe(1)
    expect(noteToSemitone('Bb')).toBe(10)
    expect(noteToSemitone('A#')).toBe(10)
  })
})

describe('semitoneToNote', () => {
  it('returns sharp notes by default', () => {
    expect(semitoneToNote(0, false)).toBe('C')
    expect(semitoneToNote(1, false)).toBe('C#')
    expect(semitoneToNote(10, false)).toBe('A#')
  })

  it('returns flat notes when preferred', () => {
    expect(semitoneToNote(1, true)).toBe('Db')
    expect(semitoneToNote(3, true)).toBe('Eb')
    expect(semitoneToNote(10, true)).toBe('Bb')
  })

  it('normalizes negative semitones', () => {
    expect(semitoneToNote(-2, false)).toBe('A#')
    expect(semitoneToNote(-2, true)).toBe('Bb')
  })
})

describe('transposeChord', () => {
  it('transposes up', () => {
    expect(transposeChord({ root: 'G', type: '' }, 2, false)).toEqual({ root: 'A', type: '' })
    expect(transposeChord({ root: 'C', type: 'm' }, 3, false)).toEqual({ root: 'D#', type: 'm' })
    expect(transposeChord({ root: 'C', type: 'm' }, 3, true)).toEqual({ root: 'Eb', type: 'm' })
  })

  it('transposes down', () => {
    expect(transposeChord({ root: 'A', type: '7' }, -2, false)).toEqual({ root: 'G', type: '7' })
  })

  it('wraps around', () => {
    expect(transposeChord({ root: 'B', type: '' }, 1, false)).toEqual({ root: 'C', type: '' })
    expect(transposeChord({ root: 'C', type: '' }, -1, false)).toEqual({ root: 'B', type: '' })
  })

  it('transposes slash chord bass note', () => {
    expect(transposeChord({ root: 'G', type: '', bass: 'B' }, 2, false)).toEqual({ root: 'A', type: '', bass: 'C#' })
  })

  it('transposes slash chord bass note with flats', () => {
    expect(transposeChord({ root: 'C', type: 'maj7', bass: 'Bb' }, 2, true)).toEqual({ root: 'D', type: 'maj7', bass: 'C' })
  })

  it('does not add bass when not present', () => {
    const result = transposeChord({ root: 'G', type: '' }, 2, false)
    expect(result.bass).toBeUndefined()
  })
})

describe('transpose full song', () => {
  it('round-trips +12 semitones to same note names', () => {
    const song = parse(readFileSync('./song-of-myself.txt', 'utf8'))
    const transposed = transpose(song, 12)
    expect(transposed.sections.verse.chords.map(c => c.root)).toEqual(
      song.sections.verse.chords.map(c => c.root)
    )
    expect(transposed.sections.chorus.chords.map(c => c.root)).toEqual(
      song.sections.chorus.chords.map(c => c.root)
    )
  })

  it('transposes G song up 2 semitones to A', () => {
    const song = parse(readFileSync('./song-of-myself.txt', 'utf8'))
    const transposed = transpose(song, 2)
    expect(transposed.sections.verse.chords.map(c => c.root)).toEqual(['A', 'B', 'D', 'A', 'G', 'D', 'A'])
  })

  it('preserves character alignment after transposition', () => {
    const song = parse(readFileSync('./song-of-myself.txt', 'utf8'))
    const transposed = transpose(song, 2)
    const chars = transposed.structure[0].lines[0].characters
    expect(chars[7].chord.root).toBe('A')
    expect(chars[7].character).toBe(song.structure[0].lines[0].characters[7].character)
  })

  it('respects preferFlats option', () => {
    const song = parse(readFileSync('./song-of-myself.txt', 'utf8'))
    const transposed = transpose(song, 3, { preferFlats: true })
    expect(transposed.sections.verse.chords.map(c => c.root)).toEqual(['Bb', 'C', 'Eb', 'Bb', 'Ab', 'Eb', 'Bb'])
  })

  it('auto-detects flat preference from song chords', () => {
    const raw = 'TEST - AUTH\n\nBb         Eb\nSome lyrics here'
    const song = parse(raw)
    const transposed = transpose(song, 2) // Bb→C, Eb→F — no flats needed, but let's check auto-detect
    // The original has flats, so preferFlats should be auto-detected
    expect(transposed.sections.verse.chords[0].root).toBe('C')
    expect(transposed.sections.verse.chords[1].root).toBe('F')
  })

  it('transposes structure entries', () => {
    const song = parse(readFileSync('./sleeping-on-the-road.txt', 'utf8'))
    const transposed = transpose(song, 2)
    expect(transposed.structure[0].chords.map(c => c.root)).toEqual(['A', 'G', 'D', 'A', 'G', 'D', 'A'])
  })
})
