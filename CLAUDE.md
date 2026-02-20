# Songsheet

A zero-dependency songsheet parser and transposer. Parses plaintext songsheet files into a structured AST with chord-lyric character alignment.

## Quick Start

```js
import { parse, transpose } from 'songsheet'

const song = parse(rawText)          // synchronous, returns plain object
const songInA = transpose(song, 2)   // up 2 semitones
const songInBb = transpose(song, 3, { preferFlats: true })
```

## Architecture

```
index.js              — Public API: re-exports parse + transpose
index.d.ts            — TypeScript type definitions (adjacent to index.js)
src/
  lexer.js            — scanChordLine(), isChordLine(), lexExpression()
  parser.js           — parse(), expression parser, section assembly
  transpose.js        — transpose(), note math
test/
  lexer.test.js       — Chord line detection, bar lines, slash chords, edge cases
  parser.test.js      — All 4 song fixture tests + bar line + time signature tests
  expression.test.js  — Expression parsing and resolution
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
          barLines: [],           // column positions of | markers
          lyrics: 'lyric line 1',
          characters: [
            { character: 'B', chord: { root: 'G', type: '' } },
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
- **Column preservation**: Chord lines are never trimmed — column positions match the original file
- **Title metadata**: BPM and time signature parsed from `(120 BPM, 3/4 time)` in the title block
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

## Future Features

### Percentage-based timing (`%`)
Support `%` notation for specifying timing or duration within a measure:

```
G%50 C%50            — split measure: 50% G, 50% C
D%75 G%25            — 3/4 D, 1/4 G
```

This would add a `duration` or `percent` field to chord objects:
```js
{ root: 'G', type: '', percent: 50 }
```

### Key detection
Auto-detect the song's key from its chord progression. Useful for intelligent transposition suggestions.

### Measure/bar grouping
Currently `|` markers are tracked by column position. Future: group chords into explicit measures with bar lines as structural delimiters.

### Multi-voice / harmony lines
Support for parallel harmony notation — multiple chord lines mapped to the same lyric line.

### Nashville number system output
Convert chord roots to Nashville numbers (1, 2, 3...) relative to the detected or specified key.
