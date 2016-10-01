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
      })
      .then(t.end)
      .catch(console.log)
  })
})
