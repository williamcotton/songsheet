const test = require('tape')
const fs = require('fs-promise')

const songsheet = require('./')({})

const loadSongsheet = (file) => fs.readFile(file, 'utf8').then(songsheet)

test('songsheet', function (t) {
  t.test('parse sleeping-on-the-road', t => {
    loadSongsheet('./sleeping-on-the-road.txt')
      .then((song) => {
        t.equal(song.get('title'), 'SLEEPING ON THE ROAD')
        t.equal(song.get('author'), 'WILLIE COTTON')
        t.equal(song.getIn(['sections', 'verse', 'count']), 4)
        t.equal(song.getIn(['sections', 'chorus', 'count']), 4)
        const structure = song.get('structure')
        t.deepEqual(structure.map(s => s.get('sectionIndex')).toArray(), [ 0, 0, 1, 1, 2, 2, 0, 3, 3, 0, 1 ])
        t.deepEqual(structure.map(s => s.get('chords').size).toArray(), [ 4, 2, 4, 2, 4, 2, 4, 4, 2, 0, 4 ])
        t.deepEqual(structure.map(s => s.get('lyrics').size).toArray(), [ 4, 2, 4, 2, 4, 2, 4, 4, 2, 0, 4 ])
        t.deepEqual(structure.map(s => !!s.get('info')).toArray(), [ false, false, false, false, false, false, false, false, false, false, false ])
        t.deepEqual(structure.map(s => s.get('sectionType')).toArray(), ['verse', 'chorus', 'verse', 'chorus', 'verse', 'chorus', 'bridge', 'verse', 'chorus', 'instrumental', 'bridge'])
      })
      .then(t.end)
      .catch(console.log)
  })

  t.test('parse riot-on-a-screen', t => {
    loadSongsheet('./riot-on-a-screen.txt')
      .then((song) => {
        t.equal(song.get('title'), 'RIOT ON A SCREEN')
        t.equal(song.get('author'), 'WILLIE COTTON')
        t.equal(song.getIn(['sections', 'fill', 'info']), ' D G D A D')
        t.equal(song.getIn(['sections', 'verse', 'count']), 2)
        t.equal(song.getIn(['sections', 'chorus', 'count']), 5)
        const structure = song.get('structure')
        t.deepEqual(structure.map(s => s.get('sectionIndex')).toArray(), [ 0, 0, 0, 1, 1, 2, 0, 3, 4, 1 ])
        t.deepEqual(structure.map(s => s.get('chords').size).toArray(), [ 6, 5, 0, 6, 5, 5, 0, 5, 5, 0 ])
        t.deepEqual(structure.map(s => s.get('lyrics').size).toArray(), [ 6, 5, 0, 6, 5, 5, 0, 5, 5, 0 ])
        t.deepEqual(structure.map(s => !!s.get('info')).toArray(), [ false, false, true, false, false, false, false, false, false, true ])
        t.deepEqual(structure.map(s => s.get('sectionType')).toArray(), ['verse', 'chorus', 'fill', 'verse', 'chorus', 'chorus', 'instrumental', 'chorus', 'chorus', 'fill'])
      })
      .then(t.end)
      .catch(console.log)
  })

  t.test('parse spent-some-time-in-buffalo', t => {
    loadSongsheet('./spent-some-time-in-buffalo.txt')
      .then((song) => {
        t.equal(song.get('title'), 'SPENT SOME TIME IN BUFFALO')
        t.equal(song.get('author'), 'WILLIE COTTON')
        t.equal(song.getIn(['sections', 'verse', 'count']), 3)
        t.equal(song.getIn(['sections', 'chorus', 'count']), 3)
        const structure = song.get('structure')
        t.deepEqual(structure.map(s => s.get('sectionIndex')).toArray(), [ 0, 1, 0, 0, 2, 1, 1, 0, 2, 2 ])
        t.deepEqual(structure.map(s => s.get('chords').size).toArray(), [ 3, 3, 1, 2, 3, 1, 2, 0, 1, 2 ])
        t.deepEqual(structure.map(s => s.get('lyrics').size).toArray(), [ 3, 3, 4, 2, 3, 4, 2, 0, 4, 2 ])
        t.deepEqual(structure.map(s => !!s.get('info')).toArray(), [ false, false, false, false, false, false, false, false, false, false ])
        t.deepEqual(structure.map(s => s.get('sectionType')).toArray(), ['verse', 'verse', 'prechorus', 'chorus', 'verse', 'prechorus', 'chorus', 'instrumental', 'prechorus', 'chorus'])
        t.deepEqual(song.getIn(['sections', 'prechorus', 'chords']).toArray(), ['D'])
        t.deepEqual(song.getIn(['sections', 'prechorus', 'lyrics']).toArray(), [' Spent some time in Buffalo', ' Dug my life out of the snow', ' And when those lake winds start to blow', ' I\'ve had my fill it\'s time to go'])
        t.deepEqual(song.getIn(['sections', 'chorus', 'lyrics']).toArray(), [' Head out west to find the good life but I\'m thinking of you now', ' Can\'t pay the rent, packing up my tent, picking up my money, I\'m headed home'])
      })
      .then(t.end)
      .catch(console.log)
  })

  t.test('parse song-of-myself', t => {
    loadSongsheet('./song-of-myself.txt')
      .then((song) => {
        t.equal(song.get('title'), 'SONG OF MYSELF')
        t.equal(song.get('author'), 'WILLIE AND WALT')
        t.equal(song.getIn(['sections', 'verse', 'count']), 1)
        t.equal(song.getIn(['sections', 'chorus', 'count']), 1)
        t.equal(song.getIn(['sections', 'bridge', 'count']), 1)
        const structure = song.get('structure')
        t.deepEqual(structure.map(s => s.get('sectionIndex')).toArray(), [ 0, 0, 0 ])
        t.deepEqual(structure.map(s => s.get('chords').size).toArray(), [ 3, 4, 2 ])
        t.deepEqual(structure.map(s => s.get('lyrics').size).toArray(), [ 3, 4, 2 ])
        t.deepEqual(structure.map(s => !!s.get('info')).toArray(), [ false, false, false ])
        t.deepEqual(structure.map(s => s.get('sectionType')).toArray(), [ 'verse', 'chorus', 'bridge' ])
        t.deepEqual(song.getIn(['sections', 'verse', 'lyrics']).toArray(), [ 'I have heard what the talkers were talking...', 'The talk of the beginning and the end,', 'But I do not talk of the beginning or the end.' ])
        t.deepEqual(song.getIn(['sections', 'chorus', 'lyrics']).toArray(), [ 'There was never any more inception than there is now,', 'Nor any more youth or age than there is now,', 'And will never be any more perfection than there is now,', 'Nor any more heaven or hell than there is now.' ])
        t.deepEqual(song.getIn(['sections', 'bridge', 'lyrics']).toArray(), [ 'Urge and urge and urge,', 'Always the procreant urge of the world.' ])
        t.deepEqual(song.getIn(['sections', 'verse', 'chords']).toArray(), [ '       G                           Am', '    C                             G', '    F        C                            G' ])
        t.deepEqual(song.getIn(['sections', 'chorus', 'chords']).toArray(), [ '          G                             C        G', '    D                          C        G ', '         G                                 C        G', '    D                            C        G' ])
        t.deepEqual(song.getIn(['sections', 'bridge', 'chords']).toArray(), [ 'C        ', '                                 G' ])
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
    t.deepEqual(line02.match(chordRegExp), [ 'A', 'G' ])
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
    t.equal(isChordLine(line02), false)
    t.equal(isChordLine(line03), true)
    t.equal(isChordLine(line04), true)
    t.equal(isChordLine(line05), true)
    t.equal(isChordLine(line06), false)
    t.equal(isChordLine(line07), true)

    t.end()
  })
})
