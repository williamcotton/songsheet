# songsheet

A zero-dependency songsheet parser and transposer. Parses plaintext songsheet files into a structured AST with chord-lyric character alignment.

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

G                               F
 Lyrics aligned under chords...
               C                G
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

## AST Shape

`parse()` returns:

```js
{
  title: 'SONG TITLE',
  author: 'AUTHOR NAME',

  // Unique section definitions
  sections: {
    verse: {
      count: 4,
      chords: [{ root: 'G', type: '' }, { root: 'F', type: '' }, ...],
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
  ]
}
```

## Transposition

`transpose()` deep-walks the AST and replaces every chord root. It auto-detects whether the song uses flats or sharps, or you can override with `{ preferFlats: true }`.

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
