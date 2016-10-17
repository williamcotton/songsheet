const { Map, List, fromJS } = require('immutable')

const isCaps = string => string.toUpperCase() === string

const chordRegExp = /(([A-G]{1}[b#]{0,1})([\w+]*))/g // http://regexr.com/3eesm
const wordRegExp = /([A-Za-z#\+7])+/g // http://regexr.com/3eep7

const isChordLine = string => string.match(chordRegExp) && string.match(wordRegExp)
  ? string.match(chordRegExp).length === string.match(wordRegExp).length && !string.match(/:/)
  : false

const multiplyRegExp = /([A-Z]*|\((.*)\))\*([0-9])/ // http://regexr.com/3eero

const multiplyExpand = line => {
  const multiplyExecResults = multiplyRegExp.exec(line)
  return multiplyExecResults 
    ? line.replace(multiplyRegExp, 
      `${multiplyExecResults[2] || multiplyExecResults[1]} `
        .repeat(multiplyRegExp.exec(line)[3]))
        .replace(/[\(\)]/g, '')
        .slice(0, -1)
    : line.replace(/[\(\)]/g, '')
}

const notSectionHeader = (lines) => !(lines.length === 1 && isCaps(lines[0]))

const getLyrics = ({ rawSection }) => {
  const lines = rawSection.split('\n')
  
  return notSectionHeader(lines)
    ? lines.reduce((lyrics, line) => {
        if (!isChordLine(line) && !isCaps(line)) {
          lyrics.push(line)
        }
        return lyrics
      }, [])
    : []
}

const getChordLines = ({ rawSection }) => {
  const lines = rawSection.split('\n')

  return notSectionHeader(lines)
    ? lines.reduce((chords, line) => {
        if (isChordLine(line)) {
          chords.push(line)
        }
        return chords
      }, [])
    : []
}

const getChords = ({ rawSection, song }) => {
  const rawSectionLine = /.*[A-Z]:/.test(rawSection)
    ? rawSection.match(/.*[A-Z]:(.*)/)[1]
    : false

  return rawSectionLine
    ? multiplyExpand(rawSectionLine)
        .match(wordRegExp)
        .map(word => {
          const section = song.get('sections').get(word.toLowerCase())
          return section
            ? section.get('chords').toArray()
            : word
        })
        .reduce((a, b) => a.concat(b), []) // flatten the array
    : getChordLines({ rawSection }).reduce((chords, line) => {
        let match
        while ( ( match = chordRegExp.exec(line) ) != null ) {
          const [,, root, type] = match
          chords.push({ root, type })
        }
        return chords
      }, [])
}

const eachCharacterWithChordLine = ({ chordLine }) => (character, index) => {
  const chordCheck = chordLine.charAt(index).match(/[A-G]/)

  const [,, root, type] = chordRegExp.exec(chordLine.slice(index).match(/[^ ]*/)[0]) || [false, false, false, false]

  return chordCheck 
    ? { chord: { root, type }, character }
    : { character }
}

const eachLyricLineWithChords = ({ chordLines }) => (lyricLine, i) => {
  const chordLine = chordLines[i]

  return chordLine
    ? lyricLine
        .match(/(.)/g)
        .map(eachCharacterWithChordLine({ chordLine }))
    : []    
}

const getLyricLineCharacters = ({ rawSection }) => {
  const lyrics = getLyrics({ rawSection })
  const chordLines = getChordLines({ rawSection })
  return lyrics && chordLines
    ? lyrics.map(eachLyricLineWithChords({ chordLines }))
    : []
}

const getSectionType = ({ rawSection, lyrics, chords, song }) => {
  // (1st, 2nd, 3rd, and all remaining ordering from cascading logic of !chorus, !bridge, verses.length >= 1)

  const sections = song.get('sections')
  const verse = sections.get('verse')
  const chorus = sections.get('chorus')
  const bridge = sections.get('bridge')

  // consider the 1st section with chords to be the verse
  if (!verse) {
    if (lyrics && chords.length > 0) {
      return ['verse']
    }
  // consider the 2nd section with chords to be the chorus
  } else if (verse.get('count') === 1 && lyrics.length > 0 && chords.length > 0 && !chorus) {
    return ['chorus']
  // consider the 3rd section with chords to be a bridge
  } else if (verse.get('count') >= 1 && lyrics.length > 0 && chords.length > 0 && chorus && !bridge) {
    return ['bridge']
  // consider all remaining sections with lyrics and no chords to be verses
  } else if (verse.get('count') >= 1 && lyrics.length > 0 && chords.length === 0 && chorus) {
    return ['verse']
  } else {
    // if LABEL: - defines and gives a section a label
    if (/.*[A-Z]:/.test(rawSection)) {
      const [, sectionTitle] = rawSection.match(/(.*[A-Z]):/)
      return [sectionTitle.toLowerCase()]
    }

    // CHORUS, CHORUS*N
    if (rawSection.substr(0, 6) === 'CHORUS') {
      if (rawSection.length === 6) return ['chorus']
      if (rawSection[6] === '*') {
        const repeat = rawSection.split('*')[1]

        const sectionTypes = []
        let i = 0
        while (i < repeat) {
          sectionTypes.push('chorus')
          i++
        }

        return sectionTypes
      }
    }

    // bridge is built in
    if (rawSection === 'BRIDGE') return ['bridge']

    // TODO: INSTRUMENTAL (BRIDGE, CHORUS*2)
    if (rawSection.split(' ')[0] === 'INSTRUMENTAL') return ['instrumental']

    // if LABEL matches on previously defined LABEL:
    if (rawSection.toLowerCase() && sections.get(rawSection.toLowerCase())) return [rawSection.toLowerCase()]

    // otherwise it's a verse
    if (lyrics && chords.length === 0) return ['verse']
  }
}

const parse = (rawSongsheet) => new Promise((resolve, reject) => {
  const rawSections = rawSongsheet.replace('\r\n', '\n').replace(/^\s*\n/gm, '\n').split('\n\n')
  resolve(rawSections.reduce((song, rawSection, structureIndex) => {
    const presentLyrics = getLyrics({ rawSection })
    const presentChords = getChords({ rawSection, song })
    const presentLyricLineCharacters = getLyricLineCharacters({ rawSection })

    const sectionTypes = getSectionType({ rawSection, lyrics: presentLyrics, chords: presentChords, song }) || []

    return sectionTypes.reduce((song, sectionType) => {
      const section = song.get('sections').get(sectionType)

      const lyrics = presentLyrics.length === 0 && section && section.get('lyrics')
        ? section.get('lyrics')
        : fromJS(presentLyrics)

      const chords = presentChords.length === 0 && section && section.get('chords')
        ? section.get('chords')
        : fromJS(presentChords)

      const lyricLineCharacters = presentLyrics.length === 0 && section && section.get('lyricLineCharacters')
        ? section.get('lyricLineCharacters')
        : fromJS(presentLyricLineCharacters)

      return (!section
        ? song.mergeDeepIn(['sections', sectionType], { lyrics, chords, lyricLineCharacters, count: 0 })
        : song)
        .updateIn(['sections', sectionType, 'count'], count => count + 1)
        .updateIn(['structure'], structure => structure.push(Map({ sectionType, lyrics, chords, lyricLineCharacters, sectionIndex: song.getIn(['sections', sectionType, 'count']) || 0 })))
    }, song)
  }, Map({
    title: rawSections[0].split(' - ')[0],
    author: rawSections[0].split(' - ')[1],
    structure: List(),
    sections: Map({}),
    rawSongsheet
  })))
})

module.exports = () => ({ 
  parse,
  chordRegExp,
  wordRegExp,
  isChordLine,
  multiplyRegExp,
  multiplyExpand
})
