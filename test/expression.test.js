import { describe, it, expect } from 'vitest'
import { parseExpression, resolveExpression } from '../src/parser.js'

describe('parseExpression', () => {
  it('parses a simple section reference', () => {
    const expr = parseExpression('VERSE')
    expect(expr).toEqual({ type: 'section_ref', name: 'verse' })
  })

  it('parses a chord list', () => {
    const expr = parseExpression('D G D A')
    expect(expr).toEqual({ type: 'chord_list', chords: [
      { root: 'D', type: '' },
      { root: 'G', type: '' },
      { root: 'D', type: '' },
      { root: 'A', type: '' },
    ]})
  })

  it('parses a chord list with repeat', () => {
    const expr = parseExpression('(D G D A)*4')
    expect(expr.type).toBe('repeat')
    expect(expr.count).toBe(4)
    expect(expr.body.type).toBe('chord_list')
    expect(expr.body.chords.length).toBe(4)
  })

  it('parses a sequence with section refs', () => {
    const expr = parseExpression('(VERSE, CHORUS*2)')
    expect(expr.type).toBe('sequence')
    expect(expr.items.length).toBe(2)
    expect(expr.items[0]).toEqual({ type: 'section_ref', name: 'verse' })
    expect(expr.items[1].type).toBe('repeat')
    expect(expr.items[1].body).toEqual({ type: 'section_ref', name: 'chorus' })
    expect(expr.items[1].count).toBe(2)
  })

  it('parses CHORUS*2 as a repeat of section ref', () => {
    const expr = parseExpression('CHORUS*2')
    expect(expr.type).toBe('repeat')
    expect(expr.body).toEqual({ type: 'section_ref', name: 'chorus' })
    expect(expr.count).toBe(2)
  })

  it('parses parenthesized section ref without repeat', () => {
    const expr = parseExpression('(VERSE)')
    expect(expr).toEqual({ type: 'section_ref', name: 'verse' })
  })
})

describe('resolveExpression', () => {
  const sections = {
    verse: { chords: [{ root: 'G', type: '' }, { root: 'F', type: '' }, { root: 'C', type: '' }] },
    chorus: { chords: [{ root: 'F', type: '' }, { root: 'C', type: '' }, { root: 'D', type: '' }] },
  }

  it('resolves a section ref', () => {
    const expr = parseExpression('VERSE')
    const chords = resolveExpression(expr, sections)
    expect(chords.map(c => c.root)).toEqual(['G', 'F', 'C'])
  })

  it('resolves a repeated section ref', () => {
    const expr = parseExpression('CHORUS*2')
    const chords = resolveExpression(expr, sections)
    expect(chords.map(c => c.root)).toEqual(['F', 'C', 'D', 'F', 'C', 'D'])
  })

  it('resolves a sequence', () => {
    const expr = parseExpression('(VERSE, CHORUS*2)')
    const chords = resolveExpression(expr, sections)
    expect(chords.map(c => c.root)).toEqual(['G', 'F', 'C', 'F', 'C', 'D', 'F', 'C', 'D'])
  })

  it('resolves a chord list repeat', () => {
    const expr = parseExpression('(D G D A)*4')
    const chords = resolveExpression(expr, {})
    expect(chords.length).toBe(16)
    expect(chords.map(c => c.root)).toEqual([
      'D', 'G', 'D', 'A',
      'D', 'G', 'D', 'A',
      'D', 'G', 'D', 'A',
      'D', 'G', 'D', 'A',
    ])
  })
})
