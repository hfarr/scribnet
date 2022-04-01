'use strict'

import assert from 'assert'

// assertion primitives
export function testEq({ actual, expected }) {
  assert.deepStrictEqual(actual, expected, `Expect ${actual} to equal ${expected}`)
}

export function testFunc(func, { input, expected }) {
  assert.deepStrictEqual(func(...input), expected, `Expect input of [ ${input.join(", ")} ] to yield ${expected}`)
}

export function testAll(singleTester, testCases) {
  for (const testCase of testCases)
    singleTester(testCase)
}

//

export function testFuncAll(func, testCases) {
  // for (const testCase of testCases )
  //   testFunc(func, testCase)
  testAll( testCase => testFunc(func, testCase), testCases )
}

export function testEqualAll(testCases) {
  testAll(testEq, testCases)
}

