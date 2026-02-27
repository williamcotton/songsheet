# songsheet

A zero-dependency songsheet parser and transposer. Parses plaintext songsheet files into a structured AST with chord-lyric alignment and builds a playback timeline.

## Install

```bash
npm install songsheet
```

## Usage

```js
import { parse, transpose } from 'songsheet'

const song = parse(rawText)          // synchronous, returns plain object
const songInA = transpose(song, 2)   // up 2 semitones
const songInF = transpose(song, -2)  // down 2 semitones
const songInBb = transpose(song, 3, { preferFlats: true })
```

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

### Metadata

BPM and time signature can be specified in parentheses after the title line:

```
SONG TITLE - AUTHOR NAME
(120 BPM)
(3/4 time)
(120 BPM, 3/4 time)
```

### Slash Chords

Slash chords like `G/B`, `Am7/E`, `F#m/C#` are supported in both chord lines and expressions. The bass note is stored separately:

```js
{ root: 'G', type: '', bass: 'B' }
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

  // Unique section definitions
  sections: {
    verse: {
      count: 4,
      chords: [{ root: 'G', type: '' }, { root: 'F', type: '', bass: 'B' }, ...],
      lyrics: ['lyric line 1', ...],
      lines: [
        {
          chords: [{ root: 'G', type: '', column: 0 }, ...],
          barLines: [             // | markers with optional carried chord context
            { column: 12, chord: { root: 'G', type: '' } }
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

  // Ordered playback structure
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

  // Flattened playback timeline (measure-by-measure)
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
          markerIndex: 0,       // marker index in the rendered line (optional)
          beatStart: 0,
          durationInBeats: 3
        }
      ]
    }
  ]
}
```

## Playback Barline Semantics

Playback is derived from each line's chords and `|` markers using these rules:

1. Each chord token is its own measure unless written as bracket split syntax (`[C D]`).
2. Each `|` repeats a measure.
3. Barline repeats use chord context carried by the parser, so leading bars on a line can repeat the previous line's chord.

Examples:

- `[C D]` -> one measure split evenly between `C` and `D`
- `C D |` -> `C`, `D`, `D`
- `| C D |` -> `C`, `D`, `D`
- `| G | C | D |` -> `G`, `G`, `C`, `C`, `D`, `D`
- `C C/B Am G F | Fsus4 F` -> `C`, `C/B`, `Am`, `G`, `F`, `F`, `Fsus4`, `F`
- `C | F C` then `| | G |` -> `C`, `C`, `F`, `C`, `C`, `C`, `G`, `G`

## Transposition

`transpose()` deep-walks the AST and replaces every chord root (and bass note on slash chords). It auto-detects whether the song uses flats or sharps, or you can override with `{ preferFlats: true }`. Playback timing metadata (`beatStart`, `durationInBeats`, `markerIndex`) is preserved.

```js
const song = parse(rawText)
const up2 = transpose(song, 2)                       // G → A
const down3 = transpose(song, -3, { preferFlats: true }) // G → Eb
```

## Development

```bash
npm test              # vitest run — all tests
npx vitest            # watch mode
npx vitest run test/parser.test.js   # single file
```

## License

ISC
