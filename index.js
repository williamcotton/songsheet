module.exports = ({}) => {
  return ({data}, callback) => {
    var info, sections, title, author, structure, verses, chorus, bridge, otherSections

    sections = data.replace('\r\n', '\n').replace(/^\s*\n/gm, '\n').split('\n\n')
    info = sections[0].split(' - ')
    title = info[0]
    author = info[1]

    structure = []
    verses = []
    otherSections = {}

    let isCaps = string => string.toUpperCase() === string

    function getLyrics({section}) {
      var lines = section.split('\n')
      if (lines.length === 1 && isCaps(lines[0])) {
        return false
      }
      var lyrics = []
      lines.forEach(line => {
        if (isCaps(line)) {
          return
        }
        lyrics.push(line)
      })
      return lyrics
    }

    function getChords({section}) {
      var lines = section.split('\n')
      if (lines.length === 1 && isCaps(lines[0])) {
        return false
      }
      var chords = []
      lines.forEach(line => {
        if (!isCaps(line) || /.*[A-Z]:/.test(line)) {
          return
        }
        chords.push(line)
      })
      return chords
    }

    function getSectionType({section, lyrics, chords, verses, chorus, bridge}) {
      // (1st, 2nd, 3rd, and all remaining ordering from cascading logic of !chorus, !bridge, verses.length >= 1)

      // consider the 1st section with chords to be the verse
      if (verses.length === 0) {
        if (lyrics && chords.length > 0) {
          return "verse"
        }

      // consider the 2nd section with chords to be the chorus
      } else if (verses.length === 1 && lyrics.length > 0 && chords.length > 0 && !chorus) {
        return "chorus"

      // consider the 3rd section with chords to be a bridge
      } else if (verses.length >= 1 && lyrics.length > 0 && chords.length > 0 && chorus && !bridge) {
        return "bridge"

      // consider all remaining sections with lyrics and no chords to be verses
      } else if (verses.length >= 1 && lyrics.length > 0 && chords.length === 0 && chorus) {
        return "verse"
      } else {
        // if LABEL: - defines and gives a section a label
        if (/.*[A-Z]:/.test(section)) {
          var sectionTitle = section.match(/.*[A-Z]:/)[0].split(':')[0].toLowerCase()
          otherSections[sectionTitle] = {lyrics, chords}
          return sectionTitle
        }

        // CHORUS, CHORUS*N
        if (section.substr(0,6) === 'CHORUS') {
          if (section.length === 6) return 'chorus'
          if (section[6] === '*') {
            repeat = section.split('*')[1]

            var sectionTypes = []
            let i = 0
            while (i < repeat) {
              sectionTypes.push('chorus')
              i++
            }

            return sectionTypes
          }
        }

        // bridge is built in
        if (section === 'BRIDGE') return 'bridge'

        // TODO: INSTRUMENTAL (BRIDGE, CHORUS*2)
        if (section.split(' ')[0] === 'INSTRUMENTAL') return 'instrumental'

        // if LABEL matches on previously defined LABEL:
        if (section.toLowerCase() && otherSections[section.toLowerCase()]) return section.toLowerCase()

        // other wise it's a verse
        if (lyrics && chords.length === 0) return 'verse'
      }
    }

    sections.forEach(section => {
      let lyrics = getLyrics({section})
      let chords = getChords({section})
      let sectionType = getSectionType({section, lyrics, chords, verses, chorus, bridge})

      if (sectionType === 'verse') {
        verses.push({lyrics, chords})
      } else if (sectionType === 'chorus' && !chorus) {
        chorus = {lyrics, chords}
      } else if (sectionType === 'bridge' && !bridge) {
        bridge = {lyrics, chords}
      }

      if (sectionType) {
        if (typeof(structure.concat) === 'function') {
          structure = structure.concat(sectionType)
        } else {
          structure.push(sectionType)
        }
      }
    })

    callback(false, {title, author, verses, chorus, bridge, structure, otherSections})
  }
}