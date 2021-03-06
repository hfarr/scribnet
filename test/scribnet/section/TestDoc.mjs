'use strict'
import assert from 'assert';

import { testAll, DocParser, DocPrinter } from '../../helpers.mjs';

import { parseDoc, printDoc, printBoundaries } from '../../helpers.mjs';

const PATH = "/home/henry/dev/scribnet/views"
const { Doc, Context, MixedContext, Segment, Gap } = await import(`${PATH}/js/scribnet/section/index.mjs`)


// const parseDoc = string => (new DocParser(string)).parse()
// const parseContext = string => (new DocParser(string)).context()
// const printDoc = doc => (new DocPrinter(doc)).print()


describe('Doc', function () {

  const segments = [
    Segment.from(...'I am a part of a larger context').applyTags(['em', 'strong']),
    Segment.from(...'I am the second part of a larger context').applyTags(['strong', 'mark']),
  ]
  const context = Context.from(...segments)
  const doc = Doc.from(context)


  const testSegments1 = [
    Segment.from(...'AAAAA'),
    Segment.from(...'BBBBB').applyTags(['B']),
  ]
  const testSegments2 = [
    Segment.from(...'CCCCC'),
    Segment.from(...'DDDDD'),
  ]
  const testSegments3 = [
    Segment.from(...'EEEEE'),
    Segment.from(...'FFFFF'),
  ]
  const testContext1 = Context.from(...testSegments1)
  const testContext2 = Context.from(...testSegments2)
  const testContext3 = Context.from(...testSegments3)
  const testDoc = Doc.from(testContext1, testContext2)

  const testDocAlpha = Doc.from(
    Context.createContext('h1', Segment.createSegment([], 'AaaaaBbbbb')),
    Context.createContext('p', Segment.createSegment([], 'CccccDdddd')),
    Context.createContext('p', Segment.createSegment([], 'EeeeeFffffGgggg')),
    Context.createContext('p'),
    Context.createContext('h1', Segment.createSegment([], 'HhhhhIiii\u{1F310}Jjjjj')),
    Context.createContext('p', Segment.createSegment([], 'KkkkkLllll')),
  )

  const testNestedContext = Context.createContext('ul',
    Context.createContext('li', Segment.from('A')),
    Context.createContext('li', Segment.from('B')),
    Context.createContext('li',
      Segment.from('C'),
      Context.createContext('ul',
        Context.createContext('li', Segment.from(...'cA')),
        Context.createContext('li', Segment.from(...'cB')),
        Context.createContext('li', Segment.from(...'cC')),
        Context.createContext('li', Segment.from(...'cD'))
      ),
    ),
    Context.createContext('li', Segment.from('D')),
  )

  const testNestedContextAlt = testNestedContext.copy()
  testNestedContextAlt.subPieces[2] = Context.createContext('ul',
    Context.createContext('li', Segment.from(...'.A')),
    Context.createContext('li', Segment.from(...'.B')),
    Context.createContext('li', Segment.from(...'.C')),
    Context.createContext('li', Segment.from(...'.D')),
  )


  const testDocEquality = ({ actual, expected }, testNum ) => {
    assert.strictEqual(printDoc(actual), printDoc(expected), `[Test case ${testNum}] Expect to be strictly equal`)
  }

  it('is equal to its own split', function () {
    // Docs split and produce another doc, unlike most Section which split into a list of Section (or subclasses of Section)
    const result = doc.splitInterior(5)
    assert(doc.eq(result))
  })

  it('preserves Segment tagging when split', function () {
    const result = doc.splitInterior(5)
      ;[segments];
    const resultSegments = [...result.subPieces.map(ctx => [...ctx.subPieces])].flat()

    assert(resultSegments[0]._eqTags(segments[0]))
    assert(resultSegments[1]._eqTags(segments[0]))
    assert(resultSegments[2]._eqTags(segments[1]))
  })

  it('applies tags NAME TBD, TODO', function () {
    const tagged = doc.applyTags(['mark'], 2, 4)

    console.log(tagged)
  })


  describe('write', function () {
    it('permits writing to an empty doc', function () {
      const newDoc = new Doc()

      const result = newDoc.write('Test')
      assert.equal(result.toString(), 'Test')
    })
    it('writes by default to the last Context', function () {
      const insertString = 'EEEEE'
      const result = testDoc.write(insertString)

      assert.equal(result.subPieces[0].length, testContext1.length)
      assert.equal(result.subPieces[1].length, testContext2.length + insertString.length)
    })
  })

  describe('delete', function () {
    it('combines contexts when a delete straddles the boundary', function () {

      const result = testDoc.delete(8, 12)

      assert.equal(result.subPieces.length, testDoc.subPieces.length - 1)
    })
    it('combines Context when a delete spans more than one boundary', function () {
      const testDoc2 = Doc.from(testContext1, testContext2, testContext1) // length 30 from [10, 10, 10]
      const result = testDoc2.delete(8, 22) // cut out testContext2, dig in to testContext1 on either side

      assert.equal(result.subPieces.length, testDoc2.subPieces.length - 2)
    })
    it('does not combine if a delete range includes the boundary of a Context, but without cutting into the other Context', function () {
      // Another complicated idea to express. Idea: if you select an entire paragraph, then delete, it should yield essentially an empty context
      // crucially, that should not, then, also combine them. Same if you select from the start of a paragraph to the middle, or from the middle
      // to the end. So long as the selection falls within the boundary of a context it won't join with adjacent ones after the delete.

      const testDoc2 = Doc.from(testContext1, testContext2, testContext1) // length 30 from [10, 10, 10]

      const result_cutAll = testDoc2.delete(10, 20)
      const result_cutLeft = testDoc2.delete(10, 15)
      const result_cutRight = testDoc2.delete(15, 20)

      assert.equal(result_cutAll.subPieces.length, testDoc2.subPieces.length, "Result should leave an empty context")
      assert.equal(result_cutLeft.subPieces.length, testDoc2.subPieces.length, "Result should not join left to middle")
      assert.equal(result_cutRight.subPieces.length, testDoc2.subPieces.length, "Result should not join middle to right")

    })

    it('it produces one empty Context when delete straddles at least one boundary between Contexts and bounds of delete are left most and right most of corresponding Context', function () {
      // Test naming award of the year goes to.... me!

      const testDoc2 = Doc.from(testContext1, testContext2, testContext3, testContext1)

      const result = testDoc2.delete(10, 30)

      assert.equal(result.subPieces.length, testDoc2.subPieces.length - 1, "Result should have one less Context than original")
      assert.equal(result.toString(), Doc.from(testContext1, new Context(), testContext1).toString())

    })
  })

  describe('deleteBoundary', function () {

    it('does not merge Segments if tags are different', function () {
      // or maybe... it only merges when appropriate. such as when they have the same tags. Or, don't merge generally.
      // testDocAlpha.select(27,30)
      const lb = testDocAlpha.cursorToBoundary(27)
      const rb = testDocAlpha.cursorToBoundary(30)
      const original = testDocAlpha.applyTags(['tag1'], lb, rb)
      // original.select(27)
      const resultLB = original.cursorToBoundary(27)
      const resultRB = original.cursorToBoundary(28)
      const result = original.deleteBoundary(resultLB, resultRB)

      const expected = [...original.contexts[2].atoms.slice(0, 5), ...original.contexts[2].atoms.slice(6)]

      assert.deepStrictEqual(result.contexts[2].atoms, expected, "expect result of deleted to match")
      assert.strictEqual(result.contexts[2].segments.length, 3, "expect result to not merge segments")
      assert(result.contexts[2].segments.some(seg => seg.hasTag), "expect result to have 'tag1' tag")

    })

    it('deletes within a Context correctly', function () {

      const testCases = [
        { 
          func: x => x.deleteBoundary(9,10),
          original: `ul < li < p <'Aaa'> > li < p <'Bbb'> > > p < 'Ccc' > p < 'Ddd' >`, 
          expected: `ul < li < p <'Aaa'> > li < p <'Bbb'> > > p < 'Cc' > p < 'Ddd' >`
        },
        {
          func: x => x.deleteBoundary(22,23),
          original: `h1<'A List'>ul<li<p<'A'>>li<p<'B'>ul<li<ul<li<p<'bA'>>>>li<p<'bB'>>>>li<p<'C'>>>p<'whoa'>p<'there'>`,
          expected: `h1<'A List'>ul<li<p<'A'>>li<p<'B'>ul<li<ul<li<p<'bA'>>>>li<p<'bB'>>>>li<p<'C'>>>p<'who'>p<'there'>`,
        }
      ]
      const testOne = ({ original, expected, func }, testCaseNum) => {
        const actual = printDoc(func(parseDoc(original)))
        assert.strictEqual(actual, printDoc(parseDoc(expected)), `[Test case ${testCaseNum}] Expect strict equality`)
      }

      testAll(testOne, testCases)

    })
  })

  describe('insert', function () {
    // it ('')
  })

  describe('tag operations', function () {
    //  TODO I need to map character indices to boundary indices. it's not enough to just count the cursor position of the document.
    //    better yet, need to map cursor indices to the correct boundary indicies. e.g we observe all boundaries of Context but only character Boundaries in Segment.


    describe('applyTags', function () {

    })
    describe('removeTags', function () {

    })
    describe('toggleTags', function () {

      it('toggles on covering a single character', function () {

        // going by cursor position
        const lb = testDocAlpha.cursorToBoundary(25)
        const rb = testDocAlpha.cursorToBoundary(26)

        const result = testDocAlpha.toggleTags(['tag1'], lb, rb)  // covering just the fourth 'e'
        const resultSegments = result.contexts[2].segments

        // assert.strictEqual(resultSegments.length, 3) // should end with three segments
        assert(resultSegments.some(seg => seg.hasTag('tag1')), "Should have applied the tag")

      })
      it('toggles off covering a single character', function () {

        const taggedDocAlpha = testDocAlpha.splice(2, 1, Context.from(Segment.createSegment([], 'Eee'), Segment.createSegment(['tag1'], 'e'), Segment.createSegment([], 'eFffffGgggg')))
        // using same cursor positions from the above test, this is essentially the "inverse"
        const lb = taggedDocAlpha.cursorToBoundary(25)
        const rb = taggedDocAlpha.cursorToBoundary(26)

        const result = taggedDocAlpha.toggleTags(['tag1'], lb, rb)  // covering just the fourth 'e'
        const resultSegments = result.contexts[2].segments

        // assert.strictEqual(resultSegments.length, 1) // should end with one
        assert(resultSegments.every(seg => !seg.hasTag('tag1')), "Should have removed the tag")

      })

    })
  })

  describe('updateBlocks', function () {
    it('updates blocks correctly', function () {
      const newBlock = 'pre'.toLocaleLowerCase()
      const result = testDocAlpha.updateBlocks(newBlock, 14, 38)

      assert(result.contexts.slice(1, 4).every(ctx => ctx.block.toLowerCase() === newBlock), 'expect Contexts covering selection to have new block tag')
      assert(result.contexts.slice(0, 1).every(ctx => ctx.block.toLowerCase() !== newBlock), 'expect Contexts before the selection to not have new block tag')
      assert(result.contexts.slice(4).every(ctx => ctx.block.toLowerCase() !== newBlock), 'expect Contexts after the selection to not have the new block tag')
    })

    it('updates in a list correctly', function () {
      const original = parseDoc(`ul < li < h1 < 'Aaa' > > li < p < 'Bbb' > > >`)
      
      const testCases = [
        { actual: original.updateBlocks('h2', 2, 3), expected: parseDoc(`ul < li < h2 < 'Aaa' > > li < p < 'Bbb' > > >`)},
      ]

      testAll(testDocEquality, testCases)

    })
  })

  describe('indentation', function () {

    const testDoc = parseDoc(`
      h1 < 'A List'>      # 0 to 6
      p < 'Sample text'>  # 7 to 18
      ul <
        li <
          p < 'A'>        # 19 to 20
        >
        li <
          p < 'B'>        # 21 to 22
          ul <
            li <
              p < 'bA'>   # 23 to 25
            >
            li <
              p < 'bB'>   # 26 to 28
            >
          >
        >
        li <
          p < 'C'>        # 29 to 30
        >
      >
    `)

    // const testDocBoundaries = printBoundaries(testDoc)
    // console.log(testDocBoundaries)

    describe('enterTab', function () {


      it('increases nesting of single interior list', function () {
        const actual = testDoc.enterTab(23, 23)

        const expected = parseDoc(`
          h1 < 'A List'>      # 0 to 6
          p < 'Sample text'>  # 7 to 18
          ul <
            li <
              p < 'A'>        # 19 to 20
            >
            li <
              p < 'B'>        # 21 to 22
              ul <
                li < ul<li<
                  p < 'bA'>   # 23 to 25
                >> >
                li <
                  p < 'bB'>   # 26 to 28
                >
              >
            >
            li <
              p < 'C'>        # 29 to 30
            >
          >
        `)

        // console.log(printDoc(actual))

        assert.strictEqual(printDoc(actual), printDoc(expected))
        assert(actual.structureEq(expected))

      })

    })

    describe('enterShiftTab', function () {

    })

    it('allows tabbing when cursor is straddling a context gap', function () {
      const testCases = [
        { args: [0, 2], original: parseDoc(`ul < li < p<'A'> > li < p<'B'> > >`), expected: parseDoc(`ul < li<ul< li < p<'A'> > li < p<'B'> > >> >`) },
        { args: [0, 2], original: parseDoc(`ul < li < p<'A'> > li < p< '' > > >`), expected: parseDoc(`ul < li<ul< li < p<'A'> > li < p< '' > > >> >`) },
        { args: [0, 2], original: parseDoc(`ul < li < p<'A'> > li < p< > > >`), expected: parseDoc(`ul < li<ul< li < p<'A'> > li < p< > > >> >`) },  // no segment to the 'p'
      ]

      const testOne = ( { original, args, expected }, testNum ) => {
        assert.strictEqual(printDoc(original.enterTab(...args)), printDoc(expected), `[Test case ${testNum}] Expected strict equality`)
      }

      testAll(testOne, testCases)
    })
  })

  describe('createList', function () {

    it('creates new unordered list', function () {

      const original = parseDoc(`h1 < 'Aaa' > p < 'Bbb' > `)

      // const actual = original.createList(false, 5, 5)

      const testCases = [
        { actual: original.createList(false, 5, 5), expected: parseDoc(`h1 < 'Aaa' > ul < li < p < 'Bbb' > > >`)},
      ]

      const testOne = ({ actual, expected }, testNum) => {
        assert.strictEqual(printDoc(actual), printDoc(expected), `[Test case ${testNum}] Expect to be equal`)
      }

      testAll(testOne , testCases)




    })
  })

  describe('contextBreak', function () {
    const testDoc = Doc.from(testContext1, Context.from(), testContext2)
    it('results in one more Context subPiece than original', function () {
      for (let i = 0; i < testDoc.boundariesLength; i++) {
        const result = testDoc.contextBreakAt(i)
        assert.strictEqual(result.contexts.length, testDoc.contexts.length + 1)

      }
    })
  })

  describe('cursorToBoundary', function () {
    const testDocAlpha2 = Doc.from(
      Context.createContext('p', Segment.createSegment([], 'Eee'), Segment.createSegment([], 'ee'), Segment.createSegment([], 'Fffff')),
      Context.createContext('p', Segment.createSegment([], 'Gg')),
      Context.createContext('p'),
      Context.createContext('p', Segment.createSegment([], 'ggg')),
      Context.createContext('p', Segment.createSegment([], 'Hhh'), Segment.createSegment([], 'hh'), Segment.createSegment([], 'Ii'), Segment.createSegment([], 'iii')),
    )
    const testDocAlpha3 = Doc.from(
      Context.from(Segment.from(...'Aaa'), Segment.from(...'Bbb')),
      Context.from(Segment.from(...'Ccc'), Segment.from(...'Ddd')),
    )
    it('maps cursor positions correctly', function () {
      assert.strictEqual(testDocAlpha2.cursorToBoundary(0), 0)
      assert.strictEqual(testDocAlpha2.cursorToBoundary(3), 3)
      assert.strictEqual(testDocAlpha2.cursorToBoundary(4), 5)
      assert.strictEqual(testDocAlpha2.cursorToBoundary(7), 9)
      assert.strictEqual(testDocAlpha2.cursorToBoundary(10), 12)
      assert.strictEqual(testDocAlpha2.cursorToBoundary(11), 13)
      assert.strictEqual(testDocAlpha2.cursorToBoundary(13), 15)
      assert.strictEqual(testDocAlpha2.cursorToBoundary(14), 16)
      assert.strictEqual(testDocAlpha2.cursorToBoundary(15), 17)
      assert.strictEqual(testDocAlpha2.cursorToBoundary(18), 20)
      assert.strictEqual(testDocAlpha2.cursorToBoundary(19), 21)
      assert.strictEqual(testDocAlpha2.cursorToBoundary(22), 24)
      assert.strictEqual(testDocAlpha2.cursorToBoundary(23), 26)
      assert.strictEqual(testDocAlpha2.cursorToBoundary(testDocAlpha2.totalCursorPositions - 1), testDocAlpha2.boundariesLength - 1)

    })

    it('correctly maps cursor from last position to last boundary when the last 2 Contexts have no Segments', function () {
      const testDocAlpha3 = testDocAlpha2.addSubSections(Context.createContext('p'), Context.createContext('p'))

      const lastBoundaryPosition = testDocAlpha3.boundariesLength - 1
      const lastCursorPosition = testDocAlpha3.totalCursorPositions - 1
      const result = testDocAlpha3.cursorToBoundary(lastCursorPosition)

      assert.notStrictEqual(result, 0, "expect to not be equal to the stubbed output")
      assert.strictEqual(result, lastBoundaryPosition, "expect to match last boundary position")

    })

    it('supports favoring left, right boundaries when several are adjacent', function () {

      // favor left
      assert.strictEqual(testDocAlpha3.cursorToBoundary(3), 3)
      assert.strictEqual(testDocAlpha3.cursorToBoundary(10), 11)

      // favor right
      assert.strictEqual(testDocAlpha3.cursorToBoundary(3, false), 4)
      assert.strictEqual(testDocAlpha3.cursorToBoundary(10, false), 12)
    })
    it('favors either side correctly with empty Segment', function () {
      // note that EmptySegment are typically not present. But they ARE present when we, e.g, split,
      //  without cutting them out.
      const testDocAlpha3Mod = testDocAlpha3.copy().addSubSections(Context.from(Segment.from(), Segment.from(), Segment.from(...'Eee')))

      //  Cursor pos  b-left  b-right verbal
      //  13          15      15      End of second context
      //  14          16      18      start of third context. Skips empty Segment at start of 3rd Context when favor right
      //  15          19      19      these match because there is no ambiguity of which boundary can be mapped to. this is the boundary between first and second char of 3rd segment

      assert.strictEqual(testDocAlpha3Mod.cursorToBoundary(13), 15)
      assert.strictEqual(testDocAlpha3Mod.cursorToBoundary(14), 16)
      assert.strictEqual(testDocAlpha3Mod.cursorToBoundary(13, false), 15)
      assert.strictEqual(testDocAlpha3Mod.cursorToBoundary(14, false), 18)
      assert.strictEqual(testDocAlpha3Mod.cursorToBoundary(15), 19)
      assert.strictEqual(testDocAlpha3Mod.cursorToBoundary(15, false), 19)
    })
    it('Has correct granularities', function () {  // TODO test naming

      // granularities
      assert.strictEqual(testDocAlpha3.boundariesLength, 16)       // 16 boundaries (Section)
      assert.strictEqual(testDocAlpha3.totalCursorPositions, 14)   // 14 cursor positions (EditDoc)
      assert.strictEqual(testDocAlpha3.length, 12)                 // 12 atom indices (strings)

    })

    describe('cursorToBoundary*', function () {

      it('correctly favors left or right', function () {
        /**
         testDocAlpha2 boundaries
         0 1 2 3 4 5 6 7 8 9 10 11 12
         |E|e|e| |e|e| |F|f|f| f| f|
         13 14 15
         | G| g|
         16
         |
         17 18 19 20
         | g| g| g|
         21 22 23 24 25 26 27 28 29 30 31 32 33 34
         | H| h| h|  | h| h|  | I| i|  | i| i| i|
         

         testDocAlpha2 cursorPositions
         0 1 2 3 4 5 6 7 8  9  10
         |E|e|e|e|e|F|f|f| f| f|
         11 12 13
         | G| g|
         14
         |
         15 16 17 18
         | g| g| g|
         19 20 21 22 23 24 25 26 27 28 29
         | H| h| h| h| h| I| i| i| i| i|

        c   left  right
        0   0     0
        3   3     4
        5   6     7
        10  12    12
        11  13    13
        14  16    16
        22  24    25
        24  27    28
        34  29    29
         */

        const testCases = [
          [0, 0, 0],
          [3, 3, 4],
          [5, 6, 7],
          [10, 12, 12],
          [11, 13, 13],
          [14, 16, 16],
          [22, 24, 25],
          [24, 27, 28],
          [testDocAlpha2.totalCursorPositions - 1, testDocAlpha2.boundariesLength - 1, testDocAlpha2.boundariesLength - 1]
        ]

        for (const [cursor, boundaryLeft, boundaryRight] of testCases) {
          assert.strictEqual(testDocAlpha2.cursorToBoundaryFavorLeft(cursor), boundaryLeft, `Expected cursor ${cursor} to map to ${boundaryLeft} (favoring left)`)
          assert.strictEqual(testDocAlpha2.cursorToBoundaryFavorRight(cursor), boundaryRight, `Expected cursor ${cursor} to map to ${boundaryRight} (favoring right)`)
        }
      })

    })
  })


  describe('overCount', function () {
    it('computes correct difference between boundariesLength & cursorPosition', function () {

      assert.strictEqual(testDoc.overCount(), testDoc.boundariesLength - 22) // test doc cursor positions == 22
      assert.strictEqual(testDocAlpha.overCount(), testDocAlpha.boundariesLength - 66) // test doc cursor positions == 22

    })
  })

  describe('countSegChildren', function () {
    it('counts all seg children correctly', function () {
      assert.strictEqual(testDoc.countSegChildren(), 4)
      assert.strictEqual(testDocAlpha.countSegChildren(), 5)
    })
  })

  describe('selectonHasTag', function () {
    it('detects existence of given tag in at least one Segment', function () {

      // testDocAlpha.select(19, 24)
      const original = testDocAlpha.applyTags(['tag1'], 19, 24)

      assert(original.selectionHasTag('tag1', 19, 24), 'expect selection matching applyTags selection to test positive')
      assert(original.selectionHasTag('tag1', 16, 21), 'expect selection containing first segment with tag1 to test positive')
      assert(original.selectionHasTag('tag1', 16, 20), 'expect selection overlapping first segment with tag1 to test positive')
      assert(original.selectionHasTag('tag1', 22, 27), 'expect selection containing second segment with tag1 to test positive')
      assert(original.selectionHasTag('tag1', 23, 27), 'expect selection overlapping second segment with tag1 to test positive')
    })
  })
  describe('selectonEntirelyHasTag', function () {
    it('detects existence of given tag in every Segment within range', function () {

      // testDocAlpha.select(19, 24)
      const original = testDocAlpha.applyTags(['tag1'], 19, 24)

      // applying tags involves splitting. Splitting creates new boundaries.
      // therefore when checking the success of the tag application we must update the boundaries as appropriate.
      // 19, 24 before split
      // ,C,c,c,c,c,D,d,d|d,d,
      // ,E,e|e,e,e,F,f,f,f,f,

      // 19, 24 after split. < and > denote the boundaries exactly covering the Segments
      // ,C,c,c,c,c,D,d,d|<d,d,
      // ,E|e>,e,e,e,F,f,f,f,f,
      const leftmost = 19 + 1
      const rightmost = 24 + 1

      // fun fact, we only noticed an issue when we swapped the implementation out with the predicateSlice. Very precise.

      assert(original.selectionEntirelyHasTag('tag1', leftmost, rightmost), 'expect selection matching applyTags selection to test positive')
      assert(!original.selectionEntirelyHasTag('tag1', 16, 21), 'expect selection containing first segment with tag1 and other segments to test negative')
      assert(!original.selectionEntirelyHasTag('tag1', 16, 20), 'expect selection overlapping first segment with tag1 and other segments to test negative')
      assert(!original.selectionEntirelyHasTag('tag1', 22, 27), 'expect selection containing second segment with tag1 and other segments to test negative')
      assert(!original.selectionEntirelyHasTag('tag1', 23, 27), 'expect selection overlapping second segment with tag1 and other segments to test negative')
    })
  })

  describe('Doc with Nested Context', function () {

    const testDocWithNested = Doc.from(
      Context.createContext('h1', Segment.from(...'Aaaaa'), Segment.from(...'Bbbbb')),
      Context.createContext('p', Segment.from(...'Ccccc'), Segment.from(...'Ddddd')),
      testNestedContext
    )

    describe('Nested Context', function () {

      it('uniformly converts children to Context', function () {
        assert(testNestedContext.subPieces.every(sec => sec instanceof Context))
        assert(testNestedContext.subPieces[0].subPieces.every(sec => sec instanceof Context))
        assert(testNestedContext.subPieces[1].subPieces.every(sec => sec instanceof Context))
        assert(testNestedContext.subPieces[2].subPieces.every(sec => sec instanceof Context))
        assert(testNestedContext.subPieces[3].subPieces.every(sec => sec instanceof Context))
      })

      it('Automatically converts from Context to MixedContext', function () {

        assert(testNestedContext instanceof MixedContext)

      })

    })

    describe('cursorToBoundary', function () {

      it('reports the correct number of cursor positions', function () {
        const tmpTest = Doc.from(testNestedContext)
        assert.strictEqual(tmpTest.totalCursorPositions, tmpTest.length + 8)

      })

      it('determines correct boundary from cursor', function () {
        const testCases = [
          [0, 0],
          [5, 5], [6, 7], [16, 17], [17, 19],
          [24, 26], [25, 27],
          [24, 26], [25, 27],
          [26, 28], [27, 29],
          [28, 30], [30, 32],
          [37, 39], [39, 41],
          [40, 42], [41, 43],
          [testDocWithNested.totalCursorPositions - 1, testDocWithNested.boundariesLength - 1],
        ]
        /*
                    Cursors   Boundaries
        AaaaaBbbbb  0..10     0..11
        CccccDdddd  11..21    12..23
        A           22..23    24..25
        B           24..25    26..27
        C           26..27    28..29
        cA          28..30    30..32
        cB          31..33    33..35
        cC          34..36    36..38
        cD          37..39    39..41
        D           40..41    42..43
        */
        for (const [input, expectedOutput] of testCases)
          assert.deepStrictEqual(testDocWithNested.cursorToBoundary(input), expectedOutput)

      })


    })

    describe('predicateSlice', function () {
      it('correctly flattens', function () {

      })
    })

    describe('kindSlice', function () {
      it('grabs all Sections of given kind', function () {

        const seggos = testDocWithNested.kindSlice(Segment.name, 18)
        assert(seggos.every(s => s instanceof Segment))

      })
      it('grabs correct portions', function () {

        const seggos = testDocWithNested.kindSlice(Segment.name, 18)
        const expectedEq = Segment.from(...'DddddABCcAcBcCcDD')
        assert(Context.from(...seggos).eq(expectedEq))

      })
    })

  })

  describe('Parse Doc', function () {
    // A test for testing helpers that help tests?!?!?

    it('made an empty doc', function () {
      // I'll never get tired of parsing
      const comp1 = parseDoc(`Doc <>`)
      const comp2 = parseDoc(``)
      assert(comp1.length === 0)
      assert(comp2.length === 0)
    })

    it('supports comments', function () {
      assert(parseDoc(`# non parsed, non error`))
      const testCases = [
        { input: `# non parsed, non error`, expected: `Doc <>` },
        {
          input: `Doc < # non parsed, non error
                  H1 < 'Hello' > >`, expected: `Doc < h1 < 'Hello' > >`
        },
      ]

      const testOne = ({ input, expected }) => {
        assert.strictEqual(printDoc(parseDoc(input)), printDoc(parseDoc(expected)))
      }

      testAll(testOne, testCases)

    })

  })

  describe('List elements', function () {
    // A big collection of tests for lists, specifically.

    const component = parseDoc(`
    h1 < 'A List' >           # boundaries 0-6
    ul <
      li < h1 < 'A' > >       # 7-8
      li < h1 < 'B' >         # 9-10
        ul <
          li < h2 < 'bA' > >  # 11-13
          li < h2 < 'bB' > >  # 14-16
        >
      >
      li < h1 < 'C' > >       # 17-18
    >`)

    const testDeleteBoundary = ({ input: { boundaries: [lb, rb], doc }, expected }, testCaseNum) => {
      const actual = printDoc(doc.deleteBoundary(lb, rb))
      const expectedStr = printDoc(parseDoc(expected))
      assert.strictEqual(actual, expectedStr, `Test case ${testCaseNum}`)
    }
    const testEnterNewLine = ({ input: { boundary, doc }, expected }, testCaseNum) => {
      const actual = printDoc(doc.newLine(boundary))
      const expectedStr = printDoc(parseDoc(expected))
      assert.strictEqual(actual, expectedStr, `Test case ${testCaseNum}`)
    }

    it('merges nested list item with previous (non-ul/non-ol) element', function () {
      // previous element as in what visually comes before the list item in the rendering. Or, the one that arrives
      // immediately prior in an in-order traversal.

      const initial = `h1 < 'A List' >ul <li < h1 < 'A' > >li < h1 < 'B' >ul <li < h2 < 'bA' > >li < h2 < 'bB' > >>>li < h1 < 'C' > >>`
      // expected: `h1 < 'A List' >ul <li < h1 < 'A' > >li < h1 < 'B' >ul <li < h2 < 'bA' > >li < h2 < 'bB' > >>>li < h1 < 'C' > >>`},
      const testCases = [
        {
          input: { boundaries: [6, 7], doc: component },
          expected: `h1 < 'A ListA' >ul <li < h1 < 'B' >ul <li < h2 < 'bA' > >li < h2 < 'bB' > >>>li < h1 < 'C' > >>`
        },
        {
          input: { boundaries: [8, 9], doc: component },
          expected: `h1 < 'A List' >ul <li < h1 < 'AB' > ul <li < h2 < 'bA' > >li < h2 < 'bB' >>>>li < h1 < 'C' > >>`
        },
        {
          input: { boundaries: [10, 11], doc: component },
          expected: `h1 < 'A List' >ul <li < h1 < 'A' > >li < h1 < 'BbA' >ul <li < h2 < 'bB' > >>>li < h1 < 'C' > >>`
        },
        {
          input: { boundaries: [13, 14], doc: component },
          expected: `h1 < 'A List' >ul <li < h1 < 'A' > >li < h1 < 'B' >ul <li < h2 < 'bAbB' > >>>li < h1 < 'C' > >>`
        },
        {
          input: { boundaries: [16, 17], doc: component },
          expected: `h1 < 'A List' >ul <li < h1 < 'A' > >li < h1 < 'B' >ul <li < h2 < 'bA' > >li < h2 < 'bBC' > >>>>`
        },
      ]

      testAll(testDeleteBoundary, testCases)
    })

    it('merges segments when a boundary between a list and succeeding segment is deleted', function () {
      const original = parseDoc(`ul < li < h1<'A'> > > h2<'B'>`)
      const testCases = [
        { input: { boundaries: [1, 2], doc: original }, expected: `ul < li < h1<'AB'> > >` },
      ]

      testDeleteBoundary(testCases[0], 0)

      testAll(testDeleteBoundary, testCases)
    })

    it('subsumes uls into earlier "list item" if would otherwise be first child of parent list item', function () {
      // TODO gotten good at naming these yet?
      // lets take a visual example. Consider the component above. we cut (8,11). Note that this takes out the 
      // second 'li', holding the h1 < 'B' > segment.
      // Currently it results in: li < ul < h2 < 'bB' > > > which is not incorrect.
      // I'd like to either nest it in the prior list element (likely my preference)
      // or fix the styling so that presequent markers don't show up. Having <li><ul><li></li></ul></li> causes
      // two adjacent markers which I don't want.
      // visually the list would then appear to nest under the prior List, if we opted to just stop rendering the ul/li,
      // so I will likely nest. But I would still like to solve this for the case where, say, the user tabs over
      // on a single list item. It causes not indentation but list nesting, arbitrarily, without needing a parent that is
      // strictly one level lower of nesting.

      const minimal = parseDoc(`ul < li<h1<'A'>> li<h1<'B'> ul< li<h2<'bA'>> li<h2<'bB'>> > > >`)

      const testCases = [
        { input: { boundaries: [1, 4], doc: minimal }, expected: `ul<li<h1<'AbA'>ul<li<h2<'bB'>>>>>` },
        { input: { boundaries: [1, 5], doc: minimal }, expected: `ul<li<h1<'AA'>ul<li<h2<'bB'>>>>>` },
        { input: { boundaries: [1, 6], doc: minimal }, expected: `ul<li<h1<'A'>ul<li<h2<'bB'>>>>>` },
        { input: { boundaries: [0, 4], doc: minimal }, expected: `ul<li<h1<'bA'>ul<li<h2<'bB'>>>>>` },
        // ul can go away completely as well. test 4 is maybe better in a different set.
        { input: { boundaries: [1, 7], doc: minimal }, expected: `ul<li<h1<'AbB'>>>` },
      ]

      testAll(testDeleteBoundary, testCases)

    })

    it('keeps nested lists grouped together when new line entered', function () {
      const test = parseDoc(`
      ul<
        li<h1<'A'>
          ul<
            li<h2<'B'>>
            li<h2<'C'>>
          >
        >
      >`)

      const testCases = [
        { input: { boundary: 0, doc: test }, expected: `ul<li<h1<''>>li<p<'A'>ul<li<h2<'B'>>li<h2<'C'>>>>>` },
        { input: { boundary: 1, doc: test }, expected: `ul<li<h1<'A'>>li<p<''>ul<li<h2<'B'>>li<h2<'C'>>>>>` },
        { input: { boundary: 2, doc: test.newLine(1) }, expected: `ul<li<h1<'A'>>li<p<''>>li<p<''>ul<li<h2<'B'>>li<h2<'C'>>>>>` },
        // yeah just throwing stuff in here apparently >_>
        { input: { boundary: 3, doc: test.newLine(1) }, expected: `ul<li<h1<'A'>>li<p<''>ul<li<h2<''>>li<p<'B'>>li<h2<'C'>>>>>` },
      ]

      testAll(testEnterNewLine, testCases)
    })

  })

  it('is a place for me to test', function () {
    [Segment, Context, Doc]

    const testSegments1 = [
      Segment.from(...'AAAAA'),
      Segment.from(...'BBBBB').applyTags(['B']),
    ]
    const testSegments2 = [
      Segment.from(...'CCCCC'),
      Segment.from(...'DDDDD'),
    ]
    const testContext1 = Context.from(...testSegments1)
    const testContext2 = Context.from(...testSegments2)
    const testDoc = Doc.from(testContext1, testContext2)

    assert(true)
  })
})