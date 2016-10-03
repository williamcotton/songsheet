const { Map, List, fromJS } = require('immutable')

const isCaps = string => string.toUpperCase() === string

const getLyrics = ({rawSection}) => {
  const lines = rawSection.split('\n')
  if (lines.length === 1 && isCaps(lines[0])) {
    return []
  }
  const lyrics = []
  lines.forEach(line => {
    if (!isCaps(line)) {
      lyrics.push(line)
    }
  })
  return lyrics
}

const getChords = ({rawSection}) => {
  const lines = rawSection.split('\n')
  if (lines.length === 1 && isCaps(lines[0])) {
    return []
  }
  const chords = []
  lines.forEach(line => {
    if (!isCaps(line) || /.*[A-Z]:/.test(line)) {
      return []
    }
    chords.push(line)
  })
  return chords
}

const getInfo = ({rawSection}) => {
  if (/.*[A-Z]:/.test(rawSection)) {
    const [, info] = rawSection.match(/.*[A-Z]:(.*)/)
    return info
  }
}

const getSectionType = ({rawSection, lyrics, chords, song}) => {
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

module.exports = () => (rawSongsheet) => new Promise((resolve, reject) => {
  const rawSections = rawSongsheet.replace('\r\n', '\n').replace(/^\s*\n/gm, '\n').split('\n\n')
  resolve(rawSections.reduce((song, rawSection, structureIndex) => {
    const presentLyrics = getLyrics({rawSection})
    const presentChords = getChords({rawSection})
    const presentInfo = getInfo({rawSection})

    const sectionTypes = getSectionType({rawSection, lyrics: presentLyrics, chords: presentChords, song}) || []

    return sectionTypes.reduce((song, sectionType) => {
      const section = song.get('sections').get(sectionType)

      const lyrics = presentLyrics.length === 0 && section && section.get('lyrics')
        ? section.get('lyrics')
        : fromJS(presentLyrics)

      const chords = presentChords.length === 0 && section && section.get('chords')
        ? section.get('chords')
        : fromJS(presentChords)

      const info = !presentInfo && section && section.get('info')
        ? section.get('info')
        : presentInfo

      return (!section
        ? song.mergeDeepIn(['sections', sectionType], {lyrics, chords, info, count: 0})
        : song)
        .updateIn(['sections', sectionType, 'count'], count => count + 1)
        .updateIn(['structure'], structure => structure.push(Map({ sectionType, lyrics, chords, sectionIndex: song.getIn(['sections', sectionType, 'count']) || 0, info })))
    }, song)
  }, Map({
    title: rawSections[0].split(' - ')[0],
    author: rawSections[0].split(' - ')[1],
    structure: List(),
    sections: Map({})
  })))
})
