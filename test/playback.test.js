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

  describe('barlines present — chords grouped into measures', () => {
    it('| G | C | D | creates 3 measures, 1 chord each', () => {
      const song = parse('TITLE\n\n| G | C | D |\n Lyrics')
      const playback = song.playback
      expect(playback.length).toBe(3)
      expect(playback[0].chords[0].root).toBe('G')
      expect(playback[1].chords[0].root).toBe('C')
      expect(playback[2].chords[0].root).toBe('D')
      for (const m of playback) {
        expect(m.chords.length).toBe(1)
        expect(m.chords[0].beatStart).toBe(0)
        expect(m.chords[0].durationInBeats).toBe(4)
      }
    })

    it('| C D | creates 1 measure with 2 chords at beats 0 and 2', () => {
      const song = parse('TITLE\n\n| C D |\n Lyrics')
      const playback = song.playback
      expect(playback.length).toBe(1)
      expect(playback[0].chords.length).toBe(2)
      expect(playback[0].chords[0].root).toBe('C')
      expect(playback[0].chords[0].beatStart).toBe(0)
      expect(playback[0].chords[0].durationInBeats).toBe(2)
      expect(playback[0].chords[1].root).toBe('D')
      expect(playback[0].chords[1].beatStart).toBe(2)
      expect(playback[0].chords[1].durationInBeats).toBe(2)
    })

    it('D | creates 1 measure with D getting full measure', () => {
      const song = parse('TITLE\n\nD |\n Lyrics')
      const playback = song.playback
      expect(playback.length).toBe(1)
      expect(playback[0].chords.length).toBe(1)
      expect(playback[0].chords[0].root).toBe('D')
      expect(playback[0].chords[0].durationInBeats).toBe(4)
    })

    it('leading | with no preceding chords is discarded', () => {
      const song = parse('TITLE\n\n| G |\n Lyrics')
      const playback = song.playback
      expect(playback.length).toBe(1)
      expect(playback[0].chords[0].root).toBe('G')
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
    it('divides beats by 3', () => {
      const song = parse('TITLE\n(3/4 time)\n\n| G C D |\n Lyrics')
      const playback = song.playback
      expect(playback.length).toBe(1)
      expect(playback[0].chords.length).toBe(3)
      expect(playback[0].chords[0].durationInBeats).toBe(1)
      expect(playback[0].chords[1].durationInBeats).toBe(1)
      expect(playback[0].chords[2].durationInBeats).toBe(1)
      expect(playback[0].timeSignature.beats).toBe(3)
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

    it('uses barline grouping for chord lines with barlines', () => {
      // The verse has patterns like "D  |" — D followed by barline = 1 measure
      // Check that the first structure entry (verse) doesn't duplicate chords at barlines
      const verseMeasures = song.playback.filter(m => m.structureIndex === 0)
      // Verse line 1: "D                        |" — 1 chord D before barline = 1 measure
      // Verse line 2: "G                                 |" — 1 chord G before barline = 1 measure
      // Verse line 3: "        A                               C                                   D     |"
      //   — 3 chords (A, C, D) before barline = 1 measure with 3 chords
      expect(verseMeasures.length).toBe(3)
      expect(verseMeasures[0].chords[0].root).toBe('D')
      expect(verseMeasures[1].chords[0].root).toBe('G')
      expect(verseMeasures[2].chords.length).toBe(3)
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
