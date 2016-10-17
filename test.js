const test = require('tape')
const fs = require('fs-promise')

const songsheet = require('./')({})

const loadSongsheet = (file) => fs.readFile(file, 'utf8').then(songsheet.parse)

test('songsheet', t => {
  t.test('parse sleeping-on-the-road', t => {
    loadSongsheet('./sleeping-on-the-road.txt')
      .then(song => {
        t.equal(song.get('title'), 'SLEEPING ON THE ROAD')
        t.equal(song.get('author'), 'WILLIE COTTON')
        t.equal(song.getIn(['sections', 'verse', 'count']), 4)
        t.equal(song.getIn(['sections', 'chorus', 'count']), 4)
        t.deepEqual(song.getIn(['sections', 'bridge', 'chords']).map(c => c.get('root')).toArray(), [ 'D', 'G', 'C', 'G', 'D', 'G', 'C', 'G' ])
        t.deepEqual(song.getIn(['sections', 'bridge', 'chords']).map(c => c.get('type')).toArray(), [ '7', '', '', '', '7', '', '', '' ])
        t.deepEqual(song.getIn(['sections', 'instrumental', 'chords']).map(c => c.get('root')).toArray(), [ 'G', 'F', 'C', 'G', 'F', 'C', 'G', 'F', 'C', 'D', 'F', 'C', 'G', 'F', 'C', 'D', 'F', 'C', 'G' ])
        const structure = song.get('structure')
        t.deepEqual(structure.map(s => s.get('sectionIndex')).toArray(), [ 0, 0, 1, 1, 2, 2, 0, 3, 3, 0, 1 ])
        t.deepEqual(structure.get(0).get('chords').map(c => c.get('root')).toArray(), [ 'G', 'F', 'C', 'G', 'F', 'C', 'G' ])
        t.equal(structure.get(0).get('lyricLineCharacters').get(0).get(0).get('chord'), 'G')
        t.equal(structure.get(0).get('lyricLineCharacters').get(0).get(1).get('chord'), undefined)
        t.deepEqual(structure.map(s => s.get('lyrics').size).toArray(), [ 4, 2, 4, 2, 4, 2, 4, 4, 2, 0, 4 ])
        t.deepEqual(structure.map(s => s.get('sectionType')).toArray(), ['verse', 'chorus', 'verse', 'chorus', 'verse', 'chorus', 'bridge', 'verse', 'chorus', 'instrumental', 'bridge'])
      })
      .then(t.end)
      .catch(console.log)
  })

  t.test('parse riot-on-a-screen', t => {
    loadSongsheet('./riot-on-a-screen.txt')
      .then(song => {
        t.equal(song.get('title'), 'RIOT ON A SCREEN')
        t.equal(song.get('author'), 'WILLIE COTTON')
        t.equal(song.getIn(['sections', 'verse', 'count']), 2)
        t.equal(song.getIn(['sections', 'chorus', 'count']), 5)
        t.deepEqual(song.getIn(['sections', 'fill', 'chords']).toArray(), [ 'D', 'G', 'D', 'A', 'D' ])
        t.deepEqual(song.getIn(['sections', 'instrumental', 'chords']).toArray(), [ 'D', 'G', 'D', 'A', 'D', 'G', 'D', 'A', 'D', 'G', 'D', 'A', 'D', 'G', 'D', 'A' ])
        const structure = song.get('structure')
        t.deepEqual(structure.map(s => s.get('sectionIndex')).toArray(), [ 0, 0, 0, 1, 1, 2, 0, 3, 4, 1 ])
        t.deepEqual(structure.get(0).get('chords').map(c => c.get('root')).toArray(), [ 'D', 'G', 'D', 'A', 'D', 'D', 'G', 'D', 'A', 'D'])
        t.equal(structure.get(0).get('lyricLineCharacters').get(0).get(0).get('chord'), 'D')
        t.equal(structure.get(0).get('lyricLineCharacters').get(0).get(1).get('chord'), undefined)
        t.deepEqual(structure.map(s => s.get('lyrics').size).toArray(), [ 6, 5, 0, 6, 5, 5, 0, 5, 5, 0 ])
        t.deepEqual(structure.map(s => s.get('sectionType')).toArray(), ['verse', 'chorus', 'fill', 'verse', 'chorus', 'chorus', 'instrumental', 'chorus', 'chorus', 'fill'])
      })
      .then(t.end)
      .catch(console.log)
  })

  t.test('parse spent-some-time-in-buffalo', t => {
    loadSongsheet('./spent-some-time-in-buffalo.txt')
      .then(song => {
        t.equal(song.get('title'), 'SPENT SOME TIME IN BUFFALO')
        t.equal(song.get('author'), 'WILLIE COTTON')
        t.equal(song.getIn(['sections', 'verse', 'count']), 3)
        t.equal(song.getIn(['sections', 'chorus', 'count']), 3)
        t.deepEqual(song.getIn(['sections', 'verse', 'chords']).map(c => c.get('root')).toArray(), [ 'D', 'G', 'A', 'C', 'D' ])
        t.deepEqual(song.getIn(['sections', 'prechorus', 'chords']).map(c => c.get('root')).toArray(), [ 'D' ])
        t.deepEqual(song.getIn(['sections', 'chorus', 'chords']).map(c => c.get('root')).toArray(), [ 'C', 'G', 'D', 'C', 'G', 'D' ])
        t.deepEqual(song.getIn(['sections', 'instrumental', 'chords']).map(c => c.get('root')).toArray(), [ 'D', 'G', 'A', 'C', 'D' ])
        const structure = song.get('structure')
        t.deepEqual(structure.map(s => s.get('sectionIndex')).toArray(), [ 0, 1, 0, 0, 2, 1, 1, 0, 2, 2 ])
        t.deepEqual(structure.get(0).get('chords').map(c => c.get('root')).toArray(), [ 'D', 'G', 'A', 'C', 'D' ])
        t.equal(structure.get(0).get('lyricLineCharacters').get(0).get(0).get('chord'), 'D')
        t.equal(structure.get(0).get('lyricLineCharacters').get(0).get(1).get('chord'), undefined)
        t.deepEqual(structure.map(s => s.get('lyrics').size).toArray(), [ 3, 3, 4, 2, 3, 4, 2, 0, 4, 2 ])
        t.deepEqual(structure.map(s => s.get('sectionType')).toArray(), ['verse', 'verse', 'prechorus', 'chorus', 'verse', 'prechorus', 'chorus', 'instrumental', 'prechorus', 'chorus'])
        t.deepEqual(song.getIn(['sections', 'prechorus', 'chords']).map(c => c.get('root')).toArray(), ['D'])
        t.deepEqual(song.getIn(['sections', 'prechorus', 'lyrics']).toArray(), [' Spent some time in Buffalo', ' Dug my life out of the snow', ' And when those lake winds start to blow', ' I\'ve had my fill it\'s time to go'])
        t.deepEqual(song.getIn(['sections', 'chorus', 'lyrics']).toArray(), [' Head out west to find the good life but I\'m thinking of you now', ' Can\'t pay the rent, packing up my tent, picking up my money, I\'m headed home'])
      })
      .then(t.end)
      .catch(console.log)
  })

  t.test('parse song-of-myself', t => {
    loadSongsheet('./song-of-myself.txt')
      .then(song => {
        t.equal(song.get('title'), 'SONG OF MYSELF')
        t.equal(song.get('author'), 'WILLIE AND WALT')
        t.equal(song.getIn(['sections', 'verse', 'count']), 1)
        t.equal(song.getIn(['sections', 'chorus', 'count']), 1)
        t.equal(song.getIn(['sections', 'bridge', 'count']), 1)
        const structure = song.get('structure')
        t.deepEqual(structure.map(s => s.get('sectionIndex')).toArray(), [ 0, 0, 0 ])
        t.deepEqual(structure.get(0).get('chords').map(c => c.get('root')).toArray(), [ 'G', 'A', 'C', 'G', 'F', 'C', 'G' ])
        t.deepEqual(structure.get(0).get('chords').map(c => c.get('type')).toArray(), [ '', 'm', '', '', '', '', '' ])
        t.equal(structure.get(0).get('lyricLineCharacters').get(0).get(0).get('chord'), undefined)
        t.equal(structure.get(0).get('lyricLineCharacters').get(0).get(7).get('chord'), 'G')
        t.equal(structure.get(0).get('lyricLineCharacters').get(0).get(35).get('chord'), 'Am')
        t.deepEqual(structure.map(s => s.get('lyrics').size).toArray(), [ 3, 4, 2 ])
        t.deepEqual(structure.map(s => s.get('sectionType')).toArray(), [ 'verse', 'chorus', 'bridge' ])
        t.deepEqual(song.getIn(['sections', 'verse', 'lyrics']).toArray(), [ 'I have heard what the talkers were talking...', 'The talk of the beginning and the end,', 'But I do not talk of the beginning or the end.' ])
        t.deepEqual(song.getIn(['sections', 'chorus', 'lyrics']).toArray(), [ 'There was never any more inception than there is now,', 'Nor any more youth or age than there is now,', 'And will never be any more perfection than there is now,', 'Nor any more heaven or hell than there is now.' ])
        t.deepEqual(song.getIn(['sections', 'bridge', 'lyrics']).toArray(), [ 'Urge and urge and urge,', 'Always the procreant urge of the world.' ])
        t.deepEqual(song.getIn(['sections', 'verse', 'chords']).map(c => c.get('root')).toArray(), [ 'G', 'A', 'C', 'G', 'F', 'C', 'G' ])
        t.deepEqual(song.getIn(['sections', 'verse', 'chords']).map(c => c.get('type')).toArray(), [ '', 'm', '', '', '', '', '' ])
        t.deepEqual(song.getIn(['sections', 'chorus', 'chords']).map(c => c.get('root')).toArray(), [ 'G', 'C', 'G', 'D', 'C', 'G', 'G', 'C', 'G', 'D', 'C', 'G' ])
        t.deepEqual(song.getIn(['sections', 'bridge', 'chords']).map(c => c.get('root')).toArray(), [ 'C', 'G' ])
      })
      .then(t.end)
      .catch(console.log)
  })

  t.test('chord line regular expressions', t => {
    const { chordRegExp, wordRegExp, isChordLine } = songsheet

    const line00 = '   A      G    '
    const line01 = '   A      G    Bm   '
    const line02 = '   A      G    Bk   '
    const line03 = 'A      G'
    const line04 = 'A      G    '
    const line05 = '    A      G'
    const line06 = 'This Is A Test Of Things'
    const line07 = 'Bm B# B+ Bb B7'

    t.deepEqual(line00.match(chordRegExp), [ 'A', 'G' ])
    t.deepEqual(line01.match(chordRegExp), [ 'A', 'G', 'Bm' ])
    t.deepEqual(line02.match(chordRegExp), [ 'A', 'G', 'Bk' ])
    t.deepEqual(line03.match(chordRegExp), [ 'A', 'G' ])
    t.deepEqual(line04.match(chordRegExp), [ 'A', 'G' ])
    t.deepEqual(line05.match(chordRegExp), [ 'A', 'G' ])
    t.deepEqual(line06.match(chordRegExp), [ 'A' ])
    t.deepEqual(line07.match(chordRegExp), [ 'Bm', 'B#', 'B+', 'Bb', 'B7' ])
    
    t.deepEqual(line00.match(wordRegExp), [ 'A', 'G' ])
    t.deepEqual(line01.match(wordRegExp), [ 'A', 'G', 'Bm' ])
    t.deepEqual(line02.match(wordRegExp), [ 'A', 'G', 'Bk' ])
    t.deepEqual(line03.match(wordRegExp), [ 'A', 'G' ])
    t.deepEqual(line04.match(wordRegExp), [ 'A', 'G' ])
    t.deepEqual(line05.match(wordRegExp), [ 'A', 'G' ])
    t.deepEqual(line06.match(wordRegExp), [ 'This', 'Is', 'A', 'Test', 'Of', 'Things' ])
    t.deepEqual(line07.match(wordRegExp), [ 'Bm', 'B#', 'B+', 'Bb', 'B7' ])

    t.equal(isChordLine(line00), true)
    t.equal(isChordLine(line01), true)
    t.equal(isChordLine(line02), true)
    t.equal(isChordLine(line03), true)
    t.equal(isChordLine(line04), true)
    t.equal(isChordLine(line05), true)
    t.equal(isChordLine(line06), false)
    t.equal(isChordLine(line07), true)

    t.deepEqual(chordRegExp.exec(line01)[2], 'A')
    t.deepEqual(chordRegExp.exec(line01)[2], 'G')
    t.deepEqual(chordRegExp.exec(line01)[2], 'B')
    t.deepEqual(chordRegExp.exec(line01), null)

    t.end()
  })

  t.test('multiplier regular expression', t => {
    const { multiplyRegExp, multiplyExpand } = songsheet

    const line00 = '(D G D A)*4'
    const line01 = 'D G D A D'
    const line02 = '(CHORUS*2)'
    const line03 = '(VERSE, CHORUS*2)'
    const line04 = 'CHORUS*2'
    const line05 = '(VERSE)'
    const line06 = '(D G D A)'

    t.deepEqual(multiplyRegExp.exec(line00).slice(0, 4), [ '(D G D A)*4', '(D G D A)', 'D G D A', '4' ])
    t.deepEqual(multiplyRegExp.exec(line01), null)
    t.deepEqual(multiplyRegExp.exec(line02).slice(0, 4), [ 'CHORUS*2', 'CHORUS', undefined, '2' ])
    t.deepEqual(multiplyRegExp.exec(line03).slice(0, 4), [ 'CHORUS*2', 'CHORUS', undefined, '2' ])
    t.deepEqual(multiplyRegExp.exec(line04).slice(0, 4), [ 'CHORUS*2', 'CHORUS', undefined, '2' ])
    t.deepEqual(multiplyRegExp.exec(line05), null)
    t.deepEqual(multiplyRegExp.exec(line06), null)
  
    t.deepEqual(multiplyExpand(line00), 'D G D A D G D A D G D A D G D A')
    t.deepEqual(multiplyExpand(line01), 'D G D A D')
    t.deepEqual(multiplyExpand(line02), 'CHORUS CHORUS')
    t.deepEqual(multiplyExpand(line03), 'VERSE, CHORUS CHORUS')
    t.deepEqual(multiplyExpand(line04), 'CHORUS CHORUS')
    t.deepEqual(multiplyExpand(line05), 'VERSE')
    t.deepEqual(multiplyExpand(line06), 'D G D A')

    t.end()
  })
})
