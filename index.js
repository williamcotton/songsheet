const isCaps = string => string.toUpperCase() === string

const getLyrics = ({section}) => {
  const lines = section.split('\n')
  if (lines.length === 1 && isCaps(lines[0])) {
    return false
  }
  const lyrics = []
  lines.forEach(line => {
    if (isCaps(line)) {
      return
    }
    lyrics.push(line)
  })
  return lyrics
}

const getChords = ({section}) => {
  const lines = section.split('\n')
  if (lines.length === 1 && isCaps(lines[0])) {
    return false
  }
  const chords = []
  lines.forEach(line => {
    if (!isCaps(line) || /.*[A-Z]:/.test(line)) {
      return
    }
    chords.push(line)
  })
  return chords
}

const getInfo = ({section}) => {
  if (/.*[A-Z]:/.test(section)) {
    const [, info] = section.match(/.*[A-Z]:(.*)/)
    return info
  }
}

const getSectionType = ({section, lyrics, chords, sections}) => {
  // (1st, 2nd, 3rd, and all remaining ordering from cascading logic of !chorus, !bridge, verses.length >= 1)

  // consider the 1st section with chords to be the verse
  if (!sections.verse) {
    if (lyrics && chords.length > 0) {
      return ['verse']
    }
  // consider the 2nd section with chords to be the chorus
  } else if (sections.verse.count === 1 && lyrics.length > 0 && chords.length > 0 && !sections.chorus) {
    return ['chorus']
  // consider the 3rd section with chords to be a bridge
  } else if (sections.verse.count >= 1 && lyrics.length > 0 && chords.length > 0 && sections.chorus && !sections.bridge) {
    return ['bridge']
  // consider all remaining sections with lyrics and no chords to be verses
  } else if (sections.verse.count >= 1 && lyrics.length > 0 && chords.length === 0 && sections.chorus) {
    return ['verse']
  } else {
    // if LABEL: - defines and gives a section a label
    if (/.*[A-Z]:/.test(section)) {
      const [, sectionTitle] = section.match(/(.*[A-Z]):/)
      return [sectionTitle.toLowerCase()]
    }

    // CHORUS, CHORUS*N
    if (section.substr(0, 6) === 'CHORUS') {
      if (section.length === 6) return ['chorus']
      if (section[6] === '*') {
        const repeat = section.split('*')[1]

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
    if (section === 'BRIDGE') return ['bridge']

    // TODO: INSTRUMENTAL (BRIDGE, CHORUS*2)
    if (section.split(' ')[0] === 'INSTRUMENTAL') return ['instrumental']

    // if LABEL matches on previously defined LABEL:
    if (section.toLowerCase() && sections[section.toLowerCase()]) return [section.toLowerCase()]

    // otherwise it's a verse
    if (lyrics && chords.length === 0) return ['verse']
  }
}

module.exports = () => (data) => new Promise((resolve, reject) => {
  const rawSections = data.replace('\r\n', '\n').replace(/^\s*\n/gm, '\n').split('\n\n')
  resolve(rawSections.reduce(({ title, author, structure, sections }, section, structureIndex) => {
    let lyrics = getLyrics({section})
    let chords = getChords({section})
    let info = getInfo({section})
    let sectionTypes = getSectionType({section, lyrics, chords, sections})
    if (!sectionTypes) return { structure, sections, title, author }
    sectionTypes.forEach(sectionType => {
      lyrics = !lyrics && sections[sectionType] && sections[sectionType].lyrics ? sections[sectionType].lyrics : lyrics
      chords = !chords && sections[sectionType] && sections[sectionType].chords ? sections[sectionType].chords : chords
      info = !info && sections[sectionType] && sections[sectionType].info ? sections[sectionType].info : info
      sections[sectionType] = sections[sectionType] ? sections[sectionType] : {lyrics, chords, info, count: 0}
      const sectionIndex = sections[sectionType].count
      sections[sectionType].count++
      structure = structure.concat({ sectionType, lyrics, chords, sectionIndex, info })
    })
    return { title, author, structure, sections }
  }, {title: rawSections[0].split(' - ')[0], author: rawSections[0].split(' - ')[1], structure: [], sections: {}}))
})
