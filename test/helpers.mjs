'use strict'

import assert from 'assert'

import DocParser from '../views/js/parser/DocParser.mjs'
import DocPrinter from '../views/js/parser/DocPrinter.mjs'
import { parseDoc, printDoc, parseContext, printContext } from '../views/js/parser/Wrappers.mjs'

// assertion primitives
export function testEq({ actual, expected }, testCaseNum) {
  assert.deepStrictEqual(actual, expected, `Test case ${testCaseNum}: Expect ${actual} to equal ${expected}`)
}

export function testFunc(func, { input, expected }, testCaseNum) {
  assert.deepStrictEqual(func(...input), expected, `Test case ${testCaseNum}: Expect input of [ ${input.join(", ")} ] to yield ${expected}`)
}

export function testAll(singleTester, testCases) {
  let i = 0;
  for (const testCase of testCases)
    singleTester(testCase, ++i)
}

//

export function testFuncAll(func, testCases) {
  // for (const testCase of testCases )
  //   testFunc(func, testCase)
  testAll((testCase, testCaseNum) => testFunc(func, testCase, testCaseNum), testCases)
}

export function testEqualAll(testCases) {
  testAll(testEq, testCases)
}



function rpad(pad, string) {

  let adjusted = pad - string.length
  let result = string
  while (adjusted-- > 0) result += ' '

  return result

}

function printBoundaries(doc) {
  const printed = printDoc(doc)
  const lines = printed.split('\n')

  const maxLength = lines.reduce((p, c) => c.length > p ? c.length : p, 0) + 2

  const interior = /'(.*)'/
  let nextBoundary = 0
  const mapped = lines.map(line => {
    if (interior.test(line)) {

      const [matched, group] = line.match(interior)
      const segmentText = group.replaceAll(/' '/g, '')
      const length = segmentText.length

      const result = `${rpad(maxLength, line)}# ${nextBoundary} to ${nextBoundary + length}`
      nextBoundary += length + 1
      return result
    }
    return line
  })

  return mapped.join('\n')
}


export { DocParser, DocPrinter, parseDoc, printDoc, parseContext, printContext, printBoundaries }