'use strict'


import assert from 'assert';
const PATH = "/home/henry/dev/scribnet/views"

const { Segment, Context, Doc } = await import(`${PATH}/js/scribnet/section/index.mjs`)

import { DocParser } from '../../../views/js/parser/index.mjs'

// const sample = "h1 < 'A List' > ul < li<p<'A'>> li<p<'B'>ul< li<p<'aB'>> li<p<'bB'>> >> li<p<'C'>>> "

// const docParser = new DocParser(sample)
// const doc = docParser.parse()
// const docPrinter = new DocPrinter(doc)

describe('DocParser', function () {


  describe('parse', function () {
  
    // TODO too generic of a test name, nail down specific features
    it('parses contexts and simple (untagged) segments', function() {

      const sample = "h1 < 'A List' > ul < li<p<'A'>> li<p<'B'>ul< li<p<'aB'>> li<p<'bB'>> >> li<p<'C'>>> "
      const actual = (new DocParser(sample)).parse()

      const expected = Doc.from(
        Context.createContext('h1', Segment.createSegment([], 'A List')),
        Context.createContext('ul', 
          Context.createContext('li', Segment.createSegment([], 'A')),
          Context.createContext('li', 
            Segment.createSegment([], 'B'),
            Context.createContext('ul', 
              Context.createContext('li', Segment.createSegment([], 'aB')),
              Context.createContext('li', Segment.createSegment([], 'bB')),
            )
          ),
          Context.createContext('li', Segment.createSegment([], 'C')),
        ),
      )

      assert(actual.eq(expected), "Expected atoms to be the same")
      assert(actual.structureEq(expected), "Expect structure of Sections to be the same")

    })

    it('parses tagged segments', function () {
      const sample = "p<(strong, em)'A' 'B' > p <'C'>"
      const actual = (new DocParser(sample)).parse()

      const expected = Doc.from(
        Context.createContext('p', Segment.createSegment(['strong', 'em'], 'A'), Segment.createSegment([], 'B')),
        Context.createContext('p', Segment.createSegment([], 'C')),
      )

      assert(actual.eq(expected), "Expected atoms to be the same")
      assert(actual.structureEq(expected), "Expect structure of Sections to be the same")
      assert(actual.selectionEntirelyHasTag('strong', 0, 1), "Expect to have 'strong' tag")
      assert(actual.selectionEntirelyHasTag('em', 0, 1), "Expect to have 'em' tag")

      assert(!actual.selectionHasTag('strong', 2, 3), "Expect to not have 'strong' tag")
      assert(!actual.selectionHasTag('em', 2, 3), "Expect to not have 'em' tag")

      assert(!actual.selectionHasTag('strong', 4, 5), "Expect to not have 'strong' tag")
      assert(!actual.selectionHasTag('em', 4, 5), "Expect to not have 'em' tag")

    })

    it('fails for improper formats', function () {
      // TODO sad-path tests
    })
  })
})


