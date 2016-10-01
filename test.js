const test = require('tape')
const fs = require('fs-promise')

const songsheet = require('./')({})

const loadSongsheet = (file) => fs.readFile(file, 'utf8').then(songsheet)

test('songsheet', function (t) {
  t.test('parse sleeping-on-the-road', t => {
    loadSongsheet('./sleeping-on-the-road.txt')
      .then(({title, author, structure}) => {
        t.equal(title, 'SLEEPING ON THE ROAD')
        t.equal(author, 'WILLIE COTTON')
        t.deepEqual(structure.map(s => s.sectionType), ['verse', 'chorus', 'verse', 'chorus', 'verse', 'chorus', 'bridge', 'verse', 'chorus', 'instrumental', 'bridge'])
      })
      .then(t.end)
  })

  t.test('parse riot-on-a-screen', t => {
    loadSongsheet('./riot-on-a-screen.txt')
      .then(({title, author, structure}) => {
        t.equal(title, 'RIOT ON A SCREEN')
        t.equal(author, 'WILLIE COTTON')
        t.deepEqual(structure.map(s => s.sectionType), ['verse', 'chorus', 'fill', 'verse', 'chorus', 'chorus', 'instrumental', 'chorus', 'chorus', 'fill'])
      })
      .then(t.end)
  })

  t.test('parse spent-some-time-in-buffalo', t => {
    loadSongsheet('./spent-some-time-in-buffalo.txt')
      .then(({title, author, structure, otherSections: {prechorus: {chords, lyrics}}}) => {
        t.equal(title, 'SPENT SOME TIME IN BUFFALO')
        t.equal(author, 'WILLIE COTTON')
        t.deepEqual(structure.map(s => s.sectionType), ['verse', 'verse', 'prechorus', 'chorus', 'verse', 'prechorus', 'chorus', 'instrumental', 'prechorus', 'chorus'])
        t.deepEqual(chords, ['D'])
        t.deepEqual(lyrics, [' Spent some time in Buffalo', ' Dug my life out of the snow', ' And when those lake winds start to blow', ' I\'ve had my fill it\'s time to go'])
      })
      .then(t.end)
  })
})
