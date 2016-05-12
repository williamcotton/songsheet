var test = require('tape')
var fs = require('fs')

var songsheet = require('./')({})

function loadSongsheet (file, callback) {
  fs.readFile(file, 'utf8', (err, data) => {
    if (err) {}
    songsheet({data}, (err, songInfo) => {
      if (err) {}
      callback(songInfo)
    })
  })
}

test('songsheet', function (t) {
  t.test('true', t => {
    t.equal(true, true, 'true!')
    t.end()
  })

  t.test('parse sleeping-on-the-road', t => {
    loadSongsheet('./sleeping-on-the-road.txt', ({title, author, structure}) => {
      t.equal(title, 'SLEEPING ON THE ROAD')
      t.equal(author, 'WILLIE COTTON')
      t.deepEqual(structure, ['verse', 'chorus', 'verse', 'chorus', 'verse', 'chorus', 'bridge', 'verse', 'chorus', 'instrumental', 'bridge'])
      t.end()
    })
  })

  t.test('parse riot-on-a-screen', t => {
    loadSongsheet('./riot-on-a-screen.txt', ({title, author, structure}) => {
      t.equal(title, 'RIOT ON A SCREEN')
      t.equal(author, 'WILLIE COTTON')
      t.deepEqual(structure, ['verse', 'chorus', 'fill', 'verse', 'chorus', 'chorus', 'instrumental', 'chorus', 'chorus', 'fill'])
      t.end()
    })
  })

  t.test('parse spent-some-time-in-buffalo', t => {
    loadSongsheet('./spent-some-time-in-buffalo.txt', ({title, author, structure, otherSections: {prechorus: {chords, lyrics}}}) => {
      t.equal(title, 'SPENT SOME TIME IN BUFFALO')
      t.equal(author, 'WILLIE COTTON')
      t.deepEqual(structure, ['verse', 'verse', 'prechorus', 'chorus', 'verse', 'prechorus', 'chorus', 'instrumental', 'prechorus', 'chorus'])
      t.deepEqual(chords, ['D'])
      t.deepEqual(lyrics, [' Spent some time in Buffalo', ' Dug my life out of the snow', ' And when those lake winds start to blow', ' I\'ve had my fill it\'s time to go'])
      t.end()
    })
  })
})
