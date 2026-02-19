import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { parse } from '../src/parser.js'

function loadSong(file) {
  return parse(readFileSync(file, 'utf8'))
}

describe('parse sleeping-on-the-road', () => {
  const song = loadSong('./sleeping-on-the-road.txt')

  it('extracts title and author', () => {
    expect(song.title).toBe('SLEEPING ON THE ROAD')
    expect(song.author).toBe('WILLIE COTTON')
  })

  it('counts sections correctly', () => {
    expect(song.sections.verse.count).toBe(4)
    expect(song.sections.chorus.count).toBe(4)
  })

  it('parses bridge chords', () => {
    expect(song.sections.bridge.chords.map(c => c.root)).toEqual(['D', 'G', 'C', 'G', 'D', 'G', 'C', 'G'])
    expect(song.sections.bridge.chords.map(c => c.type)).toEqual(['7', '', '', '', '7', '', '', ''])
  })

  it('resolves instrumental expression chords', () => {
    expect(song.sections.instrumental.chords.map(c => c.root)).toEqual([
      'G', 'F', 'C', 'G', 'F', 'C', 'G',
      'F', 'C', 'D', 'F', 'C', 'G',
      'F', 'C', 'D', 'F', 'C', 'G',
    ])
  })

  it('builds correct structure order', () => {
    expect(song.structure.map(s => s.sectionIndex)).toEqual([0, 0, 1, 1, 2, 2, 0, 3, 3, 0, 1])
    expect(song.structure.map(s => s.sectionType)).toEqual([
      'verse', 'chorus', 'verse', 'chorus', 'verse', 'chorus',
      'bridge', 'verse', 'chorus', 'instrumental', 'bridge',
    ])
  })

  it('parses verse chords', () => {
    expect(song.structure[0].chords.map(c => c.root)).toEqual(['G', 'F', 'C', 'G', 'F', 'C', 'G'])
  })

  it('builds character alignment', () => {
    const chars = song.structure[0].lines[0].characters
    expect(chars[0].chord.root).toBe('G')
    expect(chars[1].chord).toBeUndefined()
  })

  it('counts lyrics per structure entry', () => {
    expect(song.structure.map(s => s.lyrics.length)).toEqual([4, 2, 4, 2, 4, 2, 4, 4, 2, 0, 4])
  })
})

describe('parse riot-on-a-screen', () => {
  const song = loadSong('./riot-on-a-screen.txt')

  it('extracts title and author', () => {
    expect(song.title).toBe('RIOT ON A SCREEN')
    expect(song.author).toBe('WILLIE COTTON')
  })

  it('counts sections correctly', () => {
    expect(song.sections.verse.count).toBe(2)
    expect(song.sections.chorus.count).toBe(5)
  })

  it('parses fill chords as strings', () => {
    expect(song.sections.fill.chords.map(c => c.root)).toEqual(['D', 'G', 'D', 'A', 'D'])
  })

  it('resolves instrumental chord repeat', () => {
    expect(song.sections.instrumental.chords.map(c => c.root)).toEqual([
      'D', 'G', 'D', 'A',
      'D', 'G', 'D', 'A',
      'D', 'G', 'D', 'A',
      'D', 'G', 'D', 'A',
    ])
  })

  it('builds correct structure order', () => {
    expect(song.structure.map(s => s.sectionIndex)).toEqual([0, 0, 0, 1, 1, 2, 0, 3, 4, 1])
    expect(song.structure.map(s => s.sectionType)).toEqual([
      'verse', 'chorus', 'fill', 'verse', 'chorus', 'chorus',
      'instrumental', 'chorus', 'chorus', 'fill',
    ])
  })

  it('parses verse chords', () => {
    expect(song.structure[0].chords.map(c => c.root)).toEqual(['D', 'G', 'D', 'A', 'D', 'D', 'G', 'D', 'A', 'D'])
  })

  it('builds character alignment', () => {
    const chars = song.structure[0].lines[0].characters
    expect(chars[0].chord.root).toBe('D')
    expect(chars[1].chord).toBeUndefined()
  })

  it('counts lyrics per structure entry', () => {
    expect(song.structure.map(s => s.lyrics.length)).toEqual([6, 5, 0, 6, 5, 5, 0, 5, 5, 0])
  })
})

describe('parse spent-some-time-in-buffalo', () => {
  const song = loadSong('./spent-some-time-in-buffalo.txt')

  it('extracts title and author', () => {
    expect(song.title).toBe('SPENT SOME TIME IN BUFFALO')
    expect(song.author).toBe('WILLIE COTTON')
  })

  it('extracts BPM', () => {
    expect(song.bpm).toBe(100)
  })

  it('has null timeSignature when not specified', () => {
    expect(song.timeSignature).toBeNull()
  })

  it('counts sections correctly', () => {
    expect(song.sections.verse.count).toBe(3)
    expect(song.sections.chorus.count).toBe(3)
  })

  it('parses verse chords', () => {
    expect(song.sections.verse.chords.map(c => c.root)).toEqual(['D', 'G', 'A', 'C', 'D'])
  })

  it('parses prechorus chords', () => {
    expect(song.sections.prechorus.chords.map(c => c.root)).toEqual(['D', 'D', 'D', 'D'])
  })

  it('parses chorus chords', () => {
    expect(song.sections.chorus.chords.map(c => c.root)).toEqual(['C', 'G', 'D', 'C', 'G', 'D'])
  })

  it('resolves instrumental chords from VERSE', () => {
    expect(song.sections.instrumental.chords.map(c => c.root)).toEqual(['D', 'G', 'A', 'C', 'D'])
  })

  it('builds correct structure order', () => {
    expect(song.structure.map(s => s.sectionIndex)).toEqual([0, 1, 0, 0, 2, 1, 1, 0, 2, 2])
    expect(song.structure.map(s => s.sectionType)).toEqual([
      'verse', 'verse', 'prechorus', 'chorus', 'verse', 'prechorus', 'chorus',
      'instrumental', 'prechorus', 'chorus',
    ])
  })

  it('parses first structure entry chords', () => {
    expect(song.structure[0].chords.map(c => c.root)).toEqual(['D', 'G', 'A', 'C', 'D'])
  })

  it('builds character alignment', () => {
    const chars = song.structure[0].lines[0].characters
    expect(chars[0].chord.root).toBe('D')
    expect(chars[1].chord).toBeUndefined()
  })

  it('counts lyrics per structure entry', () => {
    expect(song.structure.map(s => s.lyrics.length)).toEqual([3, 3, 4, 2, 3, 4, 2, 0, 4, 2])
  })

  it('stores prechorus lyrics', () => {
    expect(song.sections.prechorus.lyrics).toEqual([
      ' Spent some time in Buffalo',
      ' Dug my life out of the snow',
      ' And when those lake winds start to blow',
      " I've had my fill it's time to go",
    ])
  })

  it('stores chorus lyrics', () => {
    expect(song.sections.chorus.lyrics).toEqual([
      " Head out west to find the good life but I'm thinking of you now",
      " Can't pay the rent, packing up my tent, picking up my money, I'm headed home",
    ])
  })
})

describe('parse song-of-myself', () => {
  const song = loadSong('./song-of-myself.txt')

  it('extracts title and author', () => {
    expect(song.title).toBe('SONG OF MYSELF')
    expect(song.author).toBe('WILLIE AND WALT')
  })

  it('extracts time signature', () => {
    expect(song.timeSignature).toEqual({ beats: 3, value: 4 })
  })

  it('has null BPM when not specified', () => {
    expect(song.bpm).toBeNull()
  })

  it('counts sections correctly', () => {
    expect(song.sections.verse.count).toBe(1)
    expect(song.sections.chorus.count).toBe(1)
    expect(song.sections.bridge.count).toBe(1)
  })

  it('builds correct structure order', () => {
    expect(song.structure.map(s => s.sectionIndex)).toEqual([0, 0, 0])
    expect(song.structure.map(s => s.sectionType)).toEqual(['verse', 'chorus', 'bridge'])
  })

  it('parses verse chords with types', () => {
    expect(song.structure[0].chords.map(c => c.root)).toEqual(['G', 'A', 'C', 'G', 'F', 'C', 'G'])
    expect(song.structure[0].chords.map(c => c.type)).toEqual(['', 'm', '', '', '', '', ''])
  })

  it('builds character alignment with offset chords', () => {
    const chars = song.structure[0].lines[0].characters
    // Chord at column 7 (G), lyrics start at column 0
    expect(chars[0].chord).toBeUndefined()
    expect(chars[7].chord.root).toBe('G')
    expect(chars[35].chord.root).toBe('A')
    expect(chars[35].chord.type).toBe('m')
  })

  it('counts lyrics per structure entry', () => {
    expect(song.structure.map(s => s.lyrics.length)).toEqual([3, 4, 2])
  })

  it('stores section lyrics', () => {
    expect(song.sections.verse.lyrics).toEqual([
      'I have heard what the talkers were talking...',
      'The talk of the beginning and the end,',
      'But I do not talk of the beginning or the end.',
    ])
    expect(song.sections.chorus.lyrics).toEqual([
      'There was never any more inception than there is now,',
      'Nor any more youth or age than there is now,',
      'And will never be any more perfection than there is now,',
      'Nor any more heaven or hell than there is now.',
    ])
    expect(song.sections.bridge.lyrics).toEqual([
      'Urge and urge and urge,',
      'Always the procreant urge of the world.',
    ])
  })

  it('stores verse chords in section', () => {
    expect(song.sections.verse.chords.map(c => c.root)).toEqual(['G', 'A', 'C', 'G', 'F', 'C', 'G'])
    expect(song.sections.verse.chords.map(c => c.type)).toEqual(['', 'm', '', '', '', '', ''])
  })

  it('stores chorus and bridge chords', () => {
    expect(song.sections.chorus.chords.map(c => c.root)).toEqual(['G', 'C', 'G', 'D', 'C', 'G', 'G', 'C', 'G', 'D', 'C', 'G'])
    expect(song.sections.bridge.chords.map(c => c.root)).toEqual(['C', 'G'])
  })
})

describe('time signature parsing', () => {
  it('returns null timeSignature when only BPM is present', () => {
    const song = parse('SONG - AUTHOR\n(120 BPM)\n\nG\nLyrics')
    expect(song.bpm).toBe(120)
    expect(song.timeSignature).toBeNull()
  })

  it('parses time signature without BPM', () => {
    const song = parse('SONG - AUTHOR\n(3/4 time)\n\nG\nLyrics')
    expect(song.bpm).toBeNull()
    expect(song.timeSignature).toEqual({ beats: 3, value: 4 })
  })

  it('parses both BPM and time signature together', () => {
    const song = parse('SONG - AUTHOR\n(100 BPM, 3/4 time)\n\nG\nLyrics')
    expect(song.bpm).toBe(100)
    expect(song.timeSignature).toEqual({ beats: 3, value: 4 })
  })

  it('parses reversed order: time signature before BPM', () => {
    const song = parse('SONG - AUTHOR\n(3/4 time, 100 BPM)\n\nG\nLyrics')
    expect(song.bpm).toBe(100)
    expect(song.timeSignature).toEqual({ beats: 3, value: 4 })
  })

  it('parses 6/8 time', () => {
    const song = parse('SONG - AUTHOR\n(6/8 Time)\n\nG\nLyrics')
    expect(song.timeSignature).toEqual({ beats: 6, value: 8 })
  })

  it('is case insensitive for TIME', () => {
    const song = parse('SONG - AUTHOR\n(3/4 TIME)\n\nG\nLyrics')
    expect(song.timeSignature).toEqual({ beats: 3, value: 4 })
  })

  it('returns both null when no metadata parens present', () => {
    const song = parse('SONG - AUTHOR\n\nG\nLyrics')
    expect(song.bpm).toBeNull()
    expect(song.timeSignature).toBeNull()
  })

  it('does not match non-metadata parens like (live)', () => {
    const song = parse('SONG - AUTHOR\n(live)\n\nG\nLyrics')
    expect(song.bpm).toBeNull()
    expect(song.timeSignature).toBeNull()
  })
})

describe('bar line parsing', () => {
  it('parses bar lines in chord lines', () => {
    const song = parse('TEST SONG - AUTHOR\n\n| G | C | D |\nSome lyrics here')
    const line = song.structure[0].lines[0]
    expect(line.barLines).toEqual([0, 4, 8, 12])
    expect(line.chords.map(c => c.root)).toEqual(['G', 'C', 'D'])
  })

  it('marks barLine in character alignment', () => {
    const song = parse('TEST SONG - AUTHOR\n\n| G | C |\nab cd ef')
    const chars = song.structure[0].lines[0].characters
    expect(chars[0].barLine).toBe(true)
    expect(chars[4].barLine).toBe(true)
  })
})
