import assert from 'node:assert/strict'
import test from 'node:test'

import { parseCsv } from '../src/csv.js'

test('parses headers and simple rows', () => {
  const { headers, rows } = parseCsv('Name,Email\nMonica Hayes,monica@example.com\nGreg Tate,greg@example.com')
  assert.deepEqual(headers, ['Name', 'Email'])
  assert.equal(rows.length, 2)
  assert.deepEqual(rows[0], ['Monica Hayes', 'monica@example.com'])
})

test('handles quoted fields with commas, newlines, and escaped quotes', () => {
  const { rows } = parseCsv('Name,Note\n"Hayes, Monica","line1\nline2"\n"She said ""hi""",ok')
  assert.deepEqual(rows[0], ['Hayes, Monica', 'line1\nline2'])
  assert.deepEqual(rows[1], ['She said "hi"', 'ok'])
})

test('round-trips CRLF and skips blank lines', () => {
  const { headers, rows } = parseCsv('A,B\r\n1,2\r\n\r\n3,4\r\n')
  assert.deepEqual(headers, ['A', 'B'])
  assert.deepEqual(rows, [['1', '2'], ['3', '4']])
})

test('empty input yields no headers or rows', () => {
  assert.deepEqual(parseCsv(''), { headers: [], rows: [] })
})
