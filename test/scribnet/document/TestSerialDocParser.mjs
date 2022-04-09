'use strict'
import assert from 'assert';
import { setDefaultResultOrder } from 'dns';
const PATH = "/home/henry/dev/scribnet/views"

const { default: EditDocument, expose: { } } = await import(`${PATH}/js/scribnet/document/EditDocument.mjs`)
const { Segment, Context, Doc } = await import(`${PATH}/js/scribnet/section/index.mjs`)

import SerialDocParser from '../../../views/js/scribnet/document/SerialDocParser.mjs'

import { parseDoc, printDoc } from '../../helpers.mjs';

const testDocAlpha = Doc.from(
  Context.createContext('h1', Segment.createSegment([], 'AaaaaBbbbb')),
  Context.createContext('p', Segment.createSegment([], 'CccccDdddd')),
  Context.createContext('p', Segment.createSegment([], 'EeeeeFffffGgggg')),
  Context.createContext('p'),
  Context.createContext('h1', Segment.createSegment([], 'HhhhhIiii\u{1F310}Jjjjj')),
  Context.createContext('p', Segment.createSegment([], 'KkkkkLllll')),
)

describe('SerialDocParser', function () {


  const testDocAlpha = parseDoc(`
    h1  < 'AaaaaBbbbb' >
    p   < 'CccccDdddd' >
    p   < 'EeeeeFffffGgggg' >
    p   < >   # note that including '' creates an empty Section, and not including (as here) means no section
    h2  < 'HhhhhIiii\u{1F310}Jjjjj' >
    p   < 'KkkkkLllll' >
  `)

  describe('parse', function () {
    it('parses JSON serialized Doc into correct Section', function () {

      const serialized = "{\"subPieces\":[{\"subPieces\":[{\"subPieces\":[\"A\",\"a\",\"a\",\"a\",\"a\",\"B\",\"b\",\"b\",\"b\",\"b\"],\"tags\":[]}],\"blockTag\":\"h1\",\"indentationAmount\":0,\"_length\":10,\"_bLength\":11},{\"subPieces\":[{\"subPieces\":[\"C\",\"c\",\"c\",\"c\",\"c\",\"D\",\"d\",\"d\",\"d\",\"d\"],\"tags\":[]}],\"blockTag\":\"p\",\"indentationAmount\":1,\"_length\":10},{\"subPieces\":[{\"subPieces\":[\"E\",\"e\",\"e\",\"e\",\"e\",\"F\",\"f\",\"f\",\"f\",\"f\",\"G\",\"g\",\"g\",\"g\",\"g\"],\"tags\":[]}],\"blockTag\":\"p\",\"indentationAmount\":0,\"_length\":15},{\"subPieces\":[],\"blockTag\":\"p\",\"indentationAmount\":0,\"_length\":0},{\"subPieces\":[{\"subPieces\":[\"H\",\"h\",\"h\",\"h\",\"h\",\"I\",\"i\",\"i\",\"i\",\"🌐\",\"J\",\"j\",\"j\",\"j\",\"j\"],\"tags\":[]}],\"blockTag\":\"h2\",\"indentationAmount\":0,\"_length\":15},{\"subPieces\":[{\"subPieces\":[\"K\",\"k\",\"k\",\"k\",\"k\",\"L\",\"l\",\"l\",\"l\",\"l\"],\"tags\":[]}],\"blockTag\":\"p\",\"indentationAmount\":0,\"_length\":10}],\"_length\":60}"

      const sdp = new SerialDocParser(serialized)
      // const result = Doc.parseSerialDoc(serialized)
      const result = sdp.parse()
      const expectedEq = testDocAlpha

      assert.strictEqual(printDoc(result), printDoc(expectedEq))
      assert(result.eq(expectedEq))

    })
  })
})
