import { describe, it, expect } from 'vitest'
import { scanChordLine, isChordLine, lexExpression, ExprTokenTypes } from '../src/lexer.js'
import { parse } from '../src/parser.js'
import { transpose } from '../src/transpose.js'
import { toNashville, toStandard } from '../src/notation.js'

// ─── Lexer: NNS chord scanning ─────────────────────────────────────

describe('scanChordLine NNS', () => {
  it('parses NNS roots 1-7', () => {
    const tokens = scanChordLine('1 4 5')
    expect(tokens).not.toBeNull()
    const chords = tokens.filter(t => t.type === 'CHORD')
    expect(chords.length).toBe(3)
    expect(chords[0]).toMatchObject({ root: '1', quality: '', nashville: true })
    expect(chords[1]).toMatchObject({ root: '4', quality: '', nashville: true })
    expect(chords[2]).toMatchObject({ root: '5', quality: '', nashville: true })
  })

  it('parses NNS with quality', () => {
    const tokens = scanChordLine('1 4m 5 6m')
    expect(tokens).not.toBeNull()
    const chords = tokens.filter(t => t.type === 'CHORD')
    expect(chords[1]).toMatchObject({ root: '4', quality: 'm', nashville: true })
    expect(chords[3]).toMatchObject({ root: '6', quality: 'm', nashville: true })
  })

  it('parses NNS slash chord', () => {
    const tokens = scanChordLine('1/5')
    expect(tokens).not.toBeNull()
    expect(tokens[0]).toMatchObject({ root: '1', quality: '', bass: '5', nashville: true })
  })

  it('mixes NNS and letter chords', () => {
    const tokens = scanChordLine('1 G 4 Am')
    expect(tokens).not.toBeNull()
    const chords = tokens.filter(t => t.type === 'CHORD')
    expect(chords[0].nashville).toBe(true)
    expect(chords[1].nashville).toBeUndefined()
    expect(chords[2].nashville).toBe(true)
    expect(chords[3].nashville).toBeUndefined()
  })

  it('rejects 8 or 9 as NNS roots (not valid scale degrees)', () => {
    expect(scanChordLine('8')).toBeNull()
    expect(scanChordLine('9')).toBeNull()
  })

  it('preserves column positions for NNS chords', () => {
    const tokens = scanChordLine('   1    4')
    expect(tokens[0].column).toBe(3)
    expect(tokens[1].column).toBe(8)
  })
})

// ─── Lexer: Decorator scanning ──────────────────────────────────────

describe('scanChordLine decorators', () => {
  it('parses diamond notation <G>', () => {
    const tokens = scanChordLine('<G>')
    expect(tokens).not.toBeNull()
    expect(tokens.length).toBe(1)
    expect(tokens[0]).toMatchObject({ root: 'G', quality: '', diamond: true, column: 0 })
  })

  it('parses diamond with quality <Am7>', () => {
    const tokens = scanChordLine('<Am7>')
    expect(tokens).not.toBeNull()
    expect(tokens[0]).toMatchObject({ root: 'A', quality: 'm7', diamond: true })
  })

  it('parses diamond with NNS <1>', () => {
    const tokens = scanChordLine('<1>')
    expect(tokens).not.toBeNull()
    expect(tokens[0]).toMatchObject({ root: '1', nashville: true, diamond: true })
  })

  it('parses push notation ^G', () => {
    const tokens = scanChordLine('^G')
    expect(tokens).not.toBeNull()
    expect(tokens[0]).toMatchObject({ root: 'G', quality: '', push: true, column: 0 })
  })

  it('parses push with quality ^Am7', () => {
    const tokens = scanChordLine('^Am7')
    expect(tokens).not.toBeNull()
    expect(tokens[0]).toMatchObject({ root: 'A', quality: 'm7', push: true })
  })

  it('parses push with NNS ^4', () => {
    const tokens = scanChordLine('^4')
    expect(tokens).not.toBeNull()
    expect(tokens[0]).toMatchObject({ root: '4', nashville: true, push: true })
  })

  it('parses stop notation G!', () => {
    const tokens = scanChordLine('G!')
    expect(tokens).not.toBeNull()
    expect(tokens[0]).toMatchObject({ root: 'G', quality: '', stop: true })
  })

  it('parses stop with NNS 5!', () => {
    const tokens = scanChordLine('5!')
    expect(tokens).not.toBeNull()
    expect(tokens[0]).toMatchObject({ root: '5', nashville: true, stop: true })
  })

  it('parses push+stop ^G!', () => {
    const tokens = scanChordLine('^G!')
    expect(tokens).not.toBeNull()
    expect(tokens[0]).toMatchObject({ root: 'G', push: true, stop: true })
  })

  it('parses split measure [G C]', () => {
    const tokens = scanChordLine('[G C]')
    expect(tokens).not.toBeNull()
    expect(tokens.length).toBe(1)
    expect(tokens[0].splitMeasure).toEqual([
      { root: 'G', type: '' },
      { root: 'C', type: '' },
    ])
  })

  it('parses split measure with NNS [1 4]', () => {
    const tokens = scanChordLine('[1 4]')
    expect(tokens).not.toBeNull()
    expect(tokens[0].splitMeasure).toEqual([
      { root: '1', type: '', nashville: true },
      { root: '4', type: '', nashville: true },
    ])
    expect(tokens[0].nashville).toBe(true)
  })

  it('parses split measure with qualities [Am G/B]', () => {
    const tokens = scanChordLine('[Am G/B]')
    expect(tokens).not.toBeNull()
    expect(tokens[0].splitMeasure).toEqual([
      { root: 'A', type: 'm' },
      { root: 'G', type: '', bass: 'B' },
    ])
  })

  it('rejects split measure with less than 2 chords', () => {
    expect(scanChordLine('[G]')).toBeNull()
  })

  it('mixes decorators with plain chords', () => {
    const tokens = scanChordLine('<G> Am ^D F!')
    expect(tokens).not.toBeNull()
    const chords = tokens.filter(t => t.type === 'CHORD')
    expect(chords.length).toBe(4)
    expect(chords[0].diamond).toBe(true)
    expect(chords[1].diamond).toBeUndefined()
    expect(chords[2].push).toBe(true)
    expect(chords[3].stop).toBe(true)
  })
})

// ─── Lexer: NNS in expressions ──────────────────────────────────────

describe('lexExpression NNS', () => {
  it('tokenizes NNS chords in expression', () => {
    const tokens = lexExpression('1 4 5 1')
    const chords = tokens.filter(t => t.type === ExprTokenTypes.CHORD)
    expect(chords.length).toBe(4)
    expect(chords[0]).toMatchObject({ root: '1', quality: '', nashville: true })
    expect(chords[2]).toMatchObject({ root: '5', quality: '', nashville: true })
  })

  it('handles NNS with repeat: (1 4 5)*2', () => {
    const tokens = lexExpression('(1 4 5)*2')
    const chords = tokens.filter(t => t.type === ExprTokenTypes.CHORD)
    expect(chords.length).toBe(3)
    const num = tokens.find(t => t.type === ExprTokenTypes.NUMBER)
    expect(num.value).toBe(2)
  })

  it('distinguishes NNS chord from repeat count: VERSE*2', () => {
    const tokens = lexExpression('VERSE*2')
    const words = tokens.filter(t => t.type === ExprTokenTypes.WORD)
    expect(words.length).toBe(1)
    const nums = tokens.filter(t => t.type === ExprTokenTypes.NUMBER)
    expect(nums.length).toBe(1)
    expect(nums[0].value).toBe(2)
  })

  it('tokenizes mixed NNS and letter chords', () => {
    const tokens = lexExpression('1 G 4 Am')
    const chords = tokens.filter(t => t.type === ExprTokenTypes.CHORD)
    expect(chords.length).toBe(4)
    expect(chords[0].nashville).toBe(true)
    expect(chords[1].nashville).toBeUndefined()
  })
})

// ─── Parser: Key metadata ───────────────────────────────────────────

describe('parser key metadata', () => {
  it('parses key from title metadata', () => {
    const song = parse('MY SONG - AUTHOR\n(120 BPM, G key)\n\nG\nLyrics')
    expect(song.key).toBe('G')
    expect(song.bpm).toBe(120)
  })

  it('parses key with accidental', () => {
    const song = parse('MY SONG - AUTHOR\n(Bb key)\n\nBb\nLyrics')
    expect(song.key).toBe('Bb')
  })

  it('parses key alone without BPM', () => {
    const song = parse('MY SONG - AUTHOR\n(G key)\n\nG\nLyrics')
    expect(song.key).toBe('G')
    expect(song.bpm).toBeNull()
  })

  it('parses key with time signature', () => {
    const song = parse('MY SONG - AUTHOR\n(3/4 time, D key)\n\nD\nLyrics')
    expect(song.key).toBe('D')
    expect(song.timeSignature).toEqual({ beats: 3, value: 4 })
  })

  it('returns null key when not specified', () => {
    const song = parse('MY SONG - AUTHOR\n\nG\nLyrics')
    expect(song.key).toBeNull()
  })

  it('key metadata does not appear in title', () => {
    const song = parse('MY SONG - AUTHOR\n(120 BPM, G key)\n\nG\nLyrics')
    expect(song.title).toBe('MY SONG')
    expect(song.author).toBe('AUTHOR')
  })
})

// ─── Parser: Decorator fields in AST ────────────────────────────────

describe('parser decorator propagation', () => {
  it('propagates nashville field to positioned chords', () => {
    const song = parse('SONG - AUTHOR\n(G key)\n\n1 4 5\nLyrics here')
    const chords = song.structure[0].lines[0].chords
    expect(chords[0].nashville).toBe(true)
    expect(chords[1].nashville).toBe(true)
  })

  it('propagates diamond field', () => {
    const song = parse('SONG - AUTHOR\n\n<G> Am\nLyrics here')
    const chords = song.structure[0].lines[0].chords
    expect(chords[0].diamond).toBe(true)
    expect(chords[1].diamond).toBeUndefined()
  })

  it('propagates push field', () => {
    const song = parse('SONG - AUTHOR\n\n^G Am\nLyrics here')
    const chords = song.structure[0].lines[0].chords
    expect(chords[0].push).toBe(true)
    expect(chords[1].push).toBeUndefined()
  })

  it('propagates stop field', () => {
    const song = parse('SONG - AUTHOR\n\nG! Am\nLyrics here')
    const chords = song.structure[0].lines[0].chords
    expect(chords[0].stop).toBe(true)
    expect(chords[1].stop).toBeUndefined()
  })

  it('propagates splitMeasure field', () => {
    const song = parse('SONG - AUTHOR\n\n[G C] Am\nLyrics here now')
    const chords = song.structure[0].lines[0].chords
    expect(chords[0].splitMeasure).toEqual([
      { root: 'G', type: '' },
      { root: 'C', type: '' },
    ])
    expect(chords[1].splitMeasure).toBeUndefined()
  })

  it('propagates decorator fields to section chords', () => {
    const song = parse('SONG - AUTHOR\n\n<G> Am!\nLyrics here')
    const sectionChords = song.sections.verse.chords
    expect(sectionChords[0].diamond).toBe(true)
    expect(sectionChords[1].stop).toBe(true)
  })

  it('propagates decorator fields to character alignment', () => {
    const song = parse('SONG - AUTHOR\n\n<G>\nLyrics')
    const chars = song.structure[0].lines[0].characters
    const chordChar = chars.find(c => c.chord)
    expect(chordChar.chord.diamond).toBe(true)
  })
})

// ─── Transpose: NNS guard ───────────────────────────────────────────

describe('transpose NNS guard', () => {
  it('does not modify NNS chords during transposition', () => {
    const song = parse('SONG - AUTHOR\n(G key)\n\n1 4 5\nLyrics here')
    const transposed = transpose(song, 2)
    const chords = transposed.structure[0].lines[0].chords
    expect(chords[0].root).toBe('1')
    expect(chords[1].root).toBe('4')
    expect(chords[2].root).toBe('5')
  })

  it('preserves decorator fields after transposition', () => {
    const song = parse('SONG - AUTHOR\n\n<G> ^Am D!\nLyrics here now')
    const transposed = transpose(song, 2)
    const chords = transposed.structure[0].lines[0].chords
    expect(chords[0].diamond).toBe(true)
    expect(chords[0].root).toBe('A')
    expect(chords[1].push).toBe(true)
    expect(chords[1].root).toBe('B')
    expect(chords[2].stop).toBe(true)
    expect(chords[2].root).toBe('E')
  })

  it('transposes splitMeasure sub-chords', () => {
    const song = parse('SONG - AUTHOR\n\n[G C]\nLyrics')
    const transposed = transpose(song, 2)
    const chords = transposed.structure[0].lines[0].chords
    expect(chords[0].splitMeasure).toEqual([
      { root: 'A', type: '' },
      { root: 'D', type: '' },
    ])
  })
})

// ─── Notation conversion ────────────────────────────────────────────

describe('toNashville', () => {
  it('converts letter roots to NNS numbers', () => {
    const song = parse('SONG - AUTHOR\n(G key)\n\nG C D\nLyrics here now')
    const nns = toNashville(song, 'G')
    const chords = nns.structure[0].lines[0].chords
    expect(chords[0]).toMatchObject({ root: '1', nashville: true })
    expect(chords[1]).toMatchObject({ root: '4', nashville: true })
    expect(chords[2]).toMatchObject({ root: '5', nashville: true })
  })

  it('handles minor chords', () => {
    const song = parse('SONG - AUTHOR\n(G key)\n\nAm Em\nLyrics here')
    const nns = toNashville(song, 'G')
    const chords = nns.structure[0].lines[0].chords
    expect(chords[0]).toMatchObject({ root: '2', type: 'm', nashville: true })
    expect(chords[1]).toMatchObject({ root: '6', type: 'm', nashville: true })
  })

  it('handles non-diatonic chords with flat prefix', () => {
    const song = parse('SONG - AUTHOR\n(G key)\n\nBb\nLyrics')
    const nns = toNashville(song, 'G')
    const chords = nns.structure[0].lines[0].chords
    // Bb in key of G = b3
    expect(chords[0]).toMatchObject({ root: '3', type: 'b', nashville: true })
  })

  it('converts bass notes too', () => {
    const song = parse('SONG - AUTHOR\n(G key)\n\nG/B\nLyrics')
    const nns = toNashville(song, 'G')
    const chords = nns.structure[0].lines[0].chords
    expect(chords[0].root).toBe('1')
    expect(chords[0].bass).toBe('3')
  })

  it('leaves already-NNS chords unchanged', () => {
    const song = parse('SONG - AUTHOR\n(G key)\n\n1 4 5\nLyrics here now')
    const nns = toNashville(song, 'G')
    const chords = nns.structure[0].lines[0].chords
    expect(chords[0].root).toBe('1')
    expect(chords[1].root).toBe('4')
  })

  it('converts section chords and structure chords', () => {
    const song = parse('SONG - AUTHOR\n(G key)\n\nG C D\nLyrics here now')
    const nns = toNashville(song, 'G')
    expect(nns.sections.verse.chords[0].nashville).toBe(true)
    expect(nns.structure[0].chords[0].nashville).toBe(true)
  })
})

describe('toStandard', () => {
  it('converts NNS numbers back to letter roots', () => {
    const song = parse('SONG - AUTHOR\n(G key)\n\n1 4 5\nLyrics here now')
    const std = toStandard(song, 'G')
    const chords = std.structure[0].lines[0].chords
    expect(chords[0]).toMatchObject({ root: 'G' })
    expect(chords[0].nashville).toBeUndefined()
    expect(chords[1]).toMatchObject({ root: 'C' })
    expect(chords[2]).toMatchObject({ root: 'D' })
  })

  it('preserves quality', () => {
    const song = parse('SONG - AUTHOR\n(G key)\n\n2m 5 6m\nLyrics here now')
    const std = toStandard(song, 'G')
    const chords = std.structure[0].lines[0].chords
    expect(chords[0]).toMatchObject({ root: 'A', type: 'm' })
    expect(chords[1]).toMatchObject({ root: 'D', type: '' })
    expect(chords[2]).toMatchObject({ root: 'E', type: 'm' })
  })

  it('leaves standard chords unchanged', () => {
    const song = parse('SONG - AUTHOR\n(G key)\n\nG C D\nLyrics here now')
    const std = toStandard(song, 'G')
    const chords = std.structure[0].lines[0].chords
    expect(chords[0].root).toBe('G')
    expect(chords[1].root).toBe('C')
  })

  it('round-trips: standard → NNS → standard', () => {
    const song = parse('SONG - AUTHOR\n(G key)\n\nG Am C D Em\nLyrics here now ok yes')
    const nns = toNashville(song, 'G')
    const std = toStandard(nns, 'G')
    const origChords = song.structure[0].lines[0].chords.map(c => c.root)
    const roundTripped = std.structure[0].lines[0].chords.map(c => c.root)
    expect(roundTripped).toEqual(origChords)
  })
})
