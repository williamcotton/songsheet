# Songsheet

A zero-dependency songsheet parser and transposer. Parses plaintext songsheet files into a structured AST with chord-lyric character alignment and a playback timeline.

## Quick Start

```js
import { parse, transpose } from 'songsheet'

const song = parse(rawText)          // synchronous, returns plain object
const songInA = transpose(song, 2)   // up 2 semitones
const songInBb = transpose(song, 3, { preferFlats: true })
```

## Architecture

```
index.js              — Public API: parse, transpose, toNashville, toStandard, buildPlaybackTimeline
index.d.ts            — TypeScript type definitions (adjacent to index.js)
src/
  lexer.js            — scanChordLine(), isChordLine(), lexExpression()
  parser.js           — parse(), expression parser, section assembly
  playback.js         — buildPlaybackTimeline(), barline/measure expansion
  notation.js         — toNashville(), toStandard()
  transpose.js        — transpose(), note math
test/
  lexer.test.js       — Chord line detection, bar lines, slash chords, edge cases
  parser.test.js      — All 4 song fixture tests + bar line + time signature tests
  expression.test.js  — Expression parsing and resolution
  playback.test.js    — Timeline generation, barline semantics, marker indexing
  nns.test.js         — Nashville Number System parsing/conversion coverage
  transpose.test.js   — Semitone math, round-trips, flat/sharp preference, slash chords
*.txt                 — Song fixtures (do not modify)
```

## Module Format

ESM only (`"type": "module"` in package.json). No CommonJS.

## Dev Commands

```bash
npm test              # vitest run — all tests
npx vitest            # watch mode
npx vitest run test/parser.test.js   # single file
```

## AST Shape

`parse()` returns:

```js
{
  title: 'SONG TITLE',
  author: 'AUTHOR NAME',
  bpm: 120,                // number | null
  timeSignature: {         // { beats, value } | null
    beats: 3,
    value: 4,
  },
  sections: {
    verse: {
      count: 4,
      chords: [{ root: 'G', type: '' }, { root: 'F', type: '', bass: 'B' }, ...],
      lyrics: ['lyric line 1', ...],
      lines: [
        {
          chords: [{ root: 'G', type: '', column: 0 }, ...],
          barLines: [
            { column: 12, chord: { root: 'G', type: '' } }  // optional carried context
          ],
          lyrics: 'lyric line 1',
          characters: [
            { character: 'B', chord: { root: 'G', type: '' } },
            { character: '|', barLine: true },
            { character: 'l' },
            ...
          ]
        }
      ]
    },
    chorus: { ... },
  },
  structure: [
    {
      sectionType: 'verse',
      sectionIndex: 0,
      chords: [...],
      lyrics: [...],
      lines: [...],
      expression: null,   // non-null on directive entries
    },
    ...
  ],
  playback: [
    {
      measureIndex: 0,
      structureIndex: 0,
      lineIndex: 0,
      timeSignature: { beats: 3, value: 4 },
      chords: [
        {
          root: 'G',
          type: '',
          markerIndex: 0,        // marker index in merged chord/bar marker row (optional)
          beatStart: 0,
          durationInBeats: 3
        }
      ]
    }
  ]
}
```

## Key Design Decisions

- **Chord line detection**: Exhaustive left-to-right scan — every non-whitespace token must parse as a valid chord (including slash chords) or `|`, otherwise the line is lyrics
- **root includes accidental**: `root: 'Bb'` not `root: 'B', accidental: 'b'`
- **Slash chords**: `G/B` → `{ root: 'G', type: '', bass: 'B' }`. Bass note is optional — only present on slash chords
- **Synchronous parse**: No Promise wrapper, plain objects (no Immutable.js)
- **Expression AST preserved**: `(VERSE, CHORUS*2)` stored as tree AND resolved to flat chords
- **Character alignment includes barLines**: `{ character: 'r', barLine: true }` at `|` column positions
- **Barline context is carried across chord lines**: leading `|` on a new line can repeat the prior chord
- **Column preservation**: Chord lines are never trimmed — column positions match the original file
- **Title metadata**: BPM and time signature parsed from `(120 BPM, 3/4 time)` in the title block
- **Playback timeline**: parser output includes `playback[]` measures with `beatStart`/`durationInBeats` and optional `markerIndex` for UI highlighting
- **Strict bracket split syntax**: only `[A B ...]` creates multi-chord measures; `|` markers repeat measures and never group adjacent chords
- **TypeScript types**: `index.d.ts` adjacent to `index.js` — consumers get types automatically with bundler module resolution

## Songsheet Format

```
SONG TITLE - AUTHOR NAME
(120 BPM, 3/4 time)

G                               F
 Lyrics aligned under chords...
               C/E              G/B
 More lyrics here

F                C             D
 Chorus lyrics...

 Verse lyrics without chords (inherits first verse's chord pattern)

CHORUS
CHORUS*2

PRECHORUS:
D
 Labeled section with chords...

INSTRUMENTAL: (VERSE, CHORUS*2)
FILL: D G D A D

BRIDGE
```

### Section Type Inference

1. 1st block with chords+lyrics → `verse`
2. 2nd block with chords+lyrics → `chorus`
3. 3rd block with chords+lyrics → `bridge`
4. Subsequent lyric-only blocks → `verse` (inherits first verse's chords)
5. `LABEL:` with body → named section (e.g., `prechorus`)
6. `LABEL: expression` → directive (e.g., `instrumental`, `fill`)
7. `LABEL` or `LABEL*N` → section reference / repeat

### Expression Grammar

```
Expression = Sequence
Sequence   = Item (',' Item)*
Item       = Atom ('*' Number)?
Atom       = SectionRef | ChordList | '(' Sequence ')'
```

Examples: `(VERSE, CHORUS*2)`, `(D G D A)*4`, `D G D A D`
