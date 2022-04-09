'use strict'

import assert from 'assert'

import { DocParser, DocPrinter } from '../views/js/parser/DocParser.mjs'

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
  testAll( (testCase, testCaseNum) => testFunc(func, testCase, testCaseNum), testCases )
}

export function testEqualAll(testCases) {
  testAll(testEq, testCases)
}


const parseDoc = string => (new DocParser(string)).parse()
const printDoc = doc => (new DocPrinter(doc)).print()

const parseContext = string => (new DocParser(string)).context()
const printContext = ctx => (new DocPrinter(null)).printSection(ctx)  // something about the interface here. heh. TODO DocPrinter doesn't really use the param passed to its constructor. OO is not particularly conducive to PrintyPrinting imo

export { DocParser, DocPrinter, parseDoc, printDoc, parseContext, printContext }