const test = require('tape')
const fs = require('fs-promise')

const songsheet = require('./')({})

const loadSongsheet = (file) => fs.readFile(file, 'utf8').then(songsheet)

test('songsheet', function (t) {
  t.test('parse sleeping-on-the-road', t => {
    loadSongsheet('./sleeping-on-the-road.txt')
      .then(({title, author, structure, sections: {verse, chorus}}) => {
        t.equal(title, 'SLEEPING ON THE ROAD')
        t.equal(author, 'WILLIE COTTON')
        t.equal(verse.count, 4)
        t.equal(chorus.count, 4)
        t.deepEqual(structure.map(s => !!s.chords), [ true, true, true, true, true, true, true, true, true, false, true ])
        t.deepEqual(structure.map(s => !!s.lyrics), [ true, true, true, true, true, true, true, true, true, false, true ])
        t.deepEqual(structure.map(s => !!s.info), [ false, false, false, false, false, false, false, false, false, false, false ])
        t.deepEqual(structure.map(s => s.sectionType), ['verse', 'chorus', 'verse', 'chorus', 'verse', 'chorus', 'bridge', 'verse', 'chorus', 'instrumental', 'bridge'])
      })
      .then(t.end)
      .catch(console.log)
  })

  t.test('parse riot-on-a-screen', t => {
    loadSongsheet('./riot-on-a-screen.txt')
      .then(({title, author, structure, sections: {verse, chorus, fill}}) => {
        t.equal(title, 'RIOT ON A SCREEN')
        t.equal(author, 'WILLIE COTTON')
        t.equal(fill.info, ' D G D A D')
        t.equal(verse.count, 2)
        t.equal(chorus.count, 5)
        t.deepEqual(structure.map(s => !!s.chords), [ true, true, false, true, true, true, false, true, true, false ])
        t.deepEqual(structure.map(s => !!s.lyrics), [ true, true, false, true, true, true, false, true, true, false ])
        t.deepEqual(structure.map(s => !!s.info), [ false, false, true, false, false, false, false, false, false, true ])
        t.deepEqual(structure.map(s => s.sectionType), ['verse', 'chorus', 'fill', 'verse', 'chorus', 'chorus', 'instrumental', 'chorus', 'chorus', 'fill'])
      })
      .then(t.end)
      .catch(console.log)
  })

  t.test('parse spent-some-time-in-buffalo', t => {
    loadSongsheet('./spent-some-time-in-buffalo.txt')
      .then(({title, author, structure, sections: {verse, chorus, prechorus}}) => {
        t.equal(title, 'SPENT SOME TIME IN BUFFALO')
        t.equal(author, 'WILLIE COTTON')
        t.equal(verse.count, 3)
        t.equal(chorus.count, 3)
        t.deepEqual(structure.map(s => !!s.chords), [ true, true, true, true, true, true, true, false, true, true ])
        t.deepEqual(structure.map(s => !!s.lyrics), [ true, true, true, true, true, true, true, false, true, true ])
        t.deepEqual(structure.map(s => !!s.info), [ false, false, false, false, false, false, false, false, false, false ])
        t.deepEqual(structure.map(s => s.sectionType), ['verse', 'verse', 'prechorus', 'chorus', 'verse', 'prechorus', 'chorus', 'instrumental', 'prechorus', 'chorus'])
        t.deepEqual(prechorus.chords, ['D'])
        t.deepEqual(prechorus.lyrics, [' Spent some time in Buffalo', ' Dug my life out of the snow', ' And when those lake winds start to blow', ' I\'ve had my fill it\'s time to go'])
      })
      .then(t.end)
      .catch(console.log)
  })
})
