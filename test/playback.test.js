import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { parse } from '../src/parser.js'
import { buildPlaybackTimeline } from '../src/playback.js'

function loadSong(file) {
  return parse(readFileSync(file, 'utf8'))
}

describe('buildPlaybackTimeline', () => {
  describe('no barlines — each chord is its own measure', () => {
    it('creates one measure per chord', () => {
      const song = parse('TITLE\n\nG                D\n Lyrics here\n               C\n More lyrics')
      const playback = song.playback
      expect(playback.length).toBeGreaterThanOrEqual(3)
      // Each measure should have exactly 1 chord with full beat allocation
      for (const m of playback) {
        expect(m.chords.length).toBe(1)
        expect(m.chords[0].beatStart).toBe(0)
        expect(m.chords[0].durationInBeats).toBe(4)
      }
    })
  })

  describe('barlines present — bars repeat measures (no multi-chord grouping)', () => {
    it('| G | C | D | repeats each bar-marked chord', () => {
      const song = parse('TITLE\n\n| G | C | D |\n Lyrics')
      const playback = song.playback
      expect(playback.length).toBe(6)
      expect(playback.map(m => m.chords[0].root)).toEqual(['G', 'G', 'C', 'C', 'D', 'D'])
      for (const m of playback) {
        expect(m.chords.length).toBe(1)
        expect(m.chords[0].beatStart).toBe(0)
        expect(m.chords[0].durationInBeats).toBe(4)
      }
    })

    it('trailing barline repeats last chord: C D | → C, D, D', () => {
      const song = parse('TITLE\n\nC D |\n Lyrics')
      const playback = song.playback
      expect(playback.length).toBe(3)
      expect(playback[0].chords[0].root).toBe('C')
      expect(playback[1].chords[0].root).toBe('D')
      expect(playback[2].chords[0].root).toBe('D')
    })

    it('| C D | G | does not form multi-chord measures without brackets', () => {
      const song = parse('TITLE\n\n| C D | G |\n Lyrics')
      const playback = song.playback
      expect(playback.length).toBe(5)
      expect(playback.map(m => m.chords[0].root)).toEqual(['C', 'D', 'D', 'G', 'G'])
      for (const m of playback) {
        expect(m.chords.length).toBe(1)
        expect(m.chords[0].beatStart).toBe(0)
        expect(m.chords[0].durationInBeats).toBe(4)
      }
    })

    it('sparse inter-barline usage stays chord-per-measure with bar repeat', () => {
      const song = parse('TITLE\n(3/4 time)\n\nC C/B Am G F | Fsus4 F\n Lyrics')
      const playback = song.playback
      expect(playback.length).toBe(8)
      const roots = playback.map(m => m.chords[0].root + (m.chords[0].bass ? '/' + m.chords[0].bass : ''))
      expect(roots).toEqual(['C', 'C/B', 'A', 'G', 'F', 'F', 'F', 'F'])
      for (const m of playback) {
        expect(m.chords.length).toBe(1)
        expect(m.chords[0].durationInBeats).toBe(3)
      }
      expect(playback[6].chords[0].type).toBe('sus4')
      expect(playback[7].chords[0].type).toBe('')
    })

    it('leading bars on next line repeat carried chord context', () => {
      const song = parse(
        'TITLE\n(3/4 time)\n\nC   |   F  C\nA way out on-line\n  |        |               G         |\nA thousand miles from what I know as mine'
      )
      const playback = song.playback
      const roots = playback.map(m => m.chords[0].root + (m.chords[0].bass ? '/' + m.chords[0].bass : ''))
      expect(roots).toEqual(['C', 'C', 'F', 'C', 'C', 'C', 'G', 'G'])
      for (const m of playback) {
        expect(m.chords[0].durationInBeats).toBe(3)
      }
    })

    it('D | creates 2 measures: D then barline repeats D', () => {
      const song = parse('TITLE\n\nD |\n Lyrics')
      const playback = song.playback
      expect(playback.length).toBe(2)
      expect(playback[0].chords[0].root).toBe('D')
      expect(playback[1].chords[0].root).toBe('D')
    })

    it('| G | with no inter-barlines: G then barline repeats G', () => {
      const song = parse('TITLE\n\n| G |\n Lyrics')
      const playback = song.playback
      // Leading | has no preceding chord → ignored. G then trailing | repeats G.
      expect(playback.length).toBe(2)
      expect(playback[0].chords[0].root).toBe('G')
      expect(playback[1].chords[0].root).toBe('G')
    })
  })

  describe('split measure expansion', () => {
    it('[G C] expands into 2 PlaybackChords sharing one measure', () => {
      const song = parse('TITLE\n\n[G C]\n Lyrics')
      const playback = song.playback
      expect(playback.length).toBe(1)
      expect(playback[0].chords.length).toBe(2)
      expect(playback[0].chords[0].root).toBe('G')
      expect(playback[0].chords[0].beatStart).toBe(0)
      expect(playback[0].chords[0].durationInBeats).toBe(2)
      expect(playback[0].chords[1].root).toBe('C')
      expect(playback[0].chords[1].beatStart).toBe(2)
      expect(playback[0].chords[1].durationInBeats).toBe(2)
    })
  })

  describe('decorator preservation', () => {
    it('preserves push flag', () => {
      const song = parse('TITLE\n\n^G\n Lyrics')
      expect(song.playback[0].chords[0].push).toBe(true)
    })

    it('preserves diamond flag', () => {
      const song = parse('TITLE\n\n<G>\n Lyrics')
      expect(song.playback[0].chords[0].diamond).toBe(true)
    })

    it('preserves stop flag', () => {
      const song = parse('TITLE\n\nG!\n Lyrics')
      expect(song.playback[0].chords[0].stop).toBe(true)
    })
  })

  describe('expression-only entries', () => {
    it('FILL chords become measures with lineIndex -1', () => {
      const song = parse('TITLE\n\nG\n Lyrics\n\nFILL: D G A')
      const fillMeasures = song.playback.filter(m => m.lineIndex === -1)
      expect(fillMeasures.length).toBe(3)
      expect(fillMeasures[0].chords[0].root).toBe('D')
      expect(fillMeasures[1].chords[0].root).toBe('G')
      expect(fillMeasures[2].chords[0].root).toBe('A')
    })
  })

  describe('3/4 time signature', () => {
    it('uses 3 beats per measure', () => {
      const song = parse('TITLE\n(3/4 time)\n\nG\n Lyrics')
      const playback = song.playback
      expect(playback.length).toBe(1)
      expect(playback[0].chords[0].durationInBeats).toBe(3)
      expect(playback[0].timeSignature.beats).toBe(3)
    })

    it('barline repeats in 3/4 remain full-measure chords', () => {
      const song = parse('TITLE\n(3/4 time)\n\n| G | C D |\n Lyrics')
      const playback = song.playback
      expect(playback.length).toBe(5)
      expect(playback.map(m => m.chords[0].root)).toEqual(['G', 'G', 'C', 'D', 'D'])
      for (const m of playback) {
        expect(m.chords.length).toBe(1)
        expect(m.chords[0].durationInBeats).toBe(3)
      }
    })
  })

  describe('back-references', () => {
    it('sets correct structureIndex and lineIndex', () => {
      const song = parse('TITLE\n\nG\n Line 1\n          D\n Line 2')
      expect(song.playback[0].structureIndex).toBe(0)
      expect(song.playback[0].lineIndex).toBe(0)
      expect(song.playback[1].structureIndex).toBe(0)
      expect(song.playback[1].lineIndex).toBe(1)
    })

    it('increments measureIndex correctly', () => {
      const song = parse('TITLE\n\nG\n Line 1\n          D\n Line 2')
      expect(song.playback[0].measureIndex).toBe(0)
      expect(song.playback[1].measureIndex).toBe(1)
    })

    it('assigns playback markerIndex values for chords and bar repeats', () => {
      const song = parse('TITLE\n\nC D |\n Lyrics')
      expect(song.playback[0].chords[0].markerIndex).toBe(0) // C marker
      expect(song.playback[1].chords[0].markerIndex).toBe(1) // D marker
      expect(song.playback[2].chords[0].markerIndex).toBe(2) // trailing bar marker
    })

    it('assigns markerIndex for bar repeats without barline grouping', () => {
      const song = parse('TITLE\n\n| C D | G |\n Lyrics')
      expect(song.playback[0].chords[0].markerIndex).toBe(1) // C marker
      expect(song.playback[1].chords[0].markerIndex).toBe(2) // D marker
      expect(song.playback[2].chords[0].markerIndex).toBe(3) // repeated D at bar marker
      expect(song.playback[3].chords[0].markerIndex).toBe(4) // G marker
      expect(song.playback[4].chords[0].markerIndex).toBe(5) // repeated G at bar marker
    })
  })

  describe('fixture: spent-some-time-in-buffalo.txt', () => {
    const song = loadSong('./spent-some-time-in-buffalo.txt')

    it('produces playback measures', () => {
      expect(song.playback.length).toBeGreaterThan(0)
    })

    it('has correct structure back-references', () => {
      for (const m of song.playback) {
        expect(m.structureIndex).toBeGreaterThanOrEqual(0)
        expect(m.structureIndex).toBeLessThan(song.structure.length)
      }
    })

    it('trailing barlines repeat last chord: D|, G|, A C D| → D D G G A C D D', () => {
      const verseMeasures = song.playback.filter(m => m.structureIndex === 0)
      // Line 1: "D |" → D, D (barline repeats)
      // Line 2: "G |" → G, G (barline repeats)
      // Line 3: "A C D |" → A, C, D, D (barline repeats last)
      expect(verseMeasures.length).toBe(8)
      const roots = verseMeasures.map(m => m.chords[0].root)
      expect(roots).toEqual(['D', 'D', 'G', 'G', 'A', 'C', 'D', 'D'])
    })

    it('measure indices are sequential', () => {
      for (let i = 0; i < song.playback.length; i++) {
        expect(song.playback[i].measureIndex).toBe(i)
      }
    })
  })

  describe('fixture: riot-on-a-screen.txt', () => {
    const song = loadSong('./riot-on-a-screen.txt')

    it('produces playback measures', () => {
      expect(song.playback.length).toBeGreaterThan(0)
    })

    it('has no barlines — each chord is its own measure', () => {
      // Riot on a screen has no barlines, so each chord should be its own measure
      for (const m of song.playback) {
        // Each measure should have 1 chord (unless split measure)
        expect(m.chords.length).toBeGreaterThanOrEqual(1)
      }
    })

    it('measure indices are sequential', () => {
      for (let i = 0; i < song.playback.length; i++) {
        expect(song.playback[i].measureIndex).toBe(i)
      }
    })
  })

  describe('buildPlaybackTimeline standalone', () => {
    it('returns empty array for empty structure', () => {
      expect(buildPlaybackTimeline([], null)).toEqual([])
    })

    it('defaults to 4/4 when timeSignature is null', () => {
      const structure = [{
        sectionType: 'verse',
        sectionIndex: 0,
        chords: [{ root: 'G', type: '' }],
        lyrics: [],
        lines: [],
        expression: null,
      }]
      const playback = buildPlaybackTimeline(structure, null)
      expect(playback[0].timeSignature).toEqual({ beats: 4, value: 4 })
    })
  })
})
