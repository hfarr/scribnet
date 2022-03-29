'use strict'
import assert from 'assert';

const PATH = "/home/henry/dev/scribnet/views"
const MODULE = "Context"
const { Doc, Context, MixedContext, Segment, Gap } = await import(`${PATH}/js/scribnet/section/${MODULE}.mjs`)

describe('Context', function() {

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


  describe('Segment', function () {

    const testSegment = Segment.from(...'I am the string belonging to a section. I render with a logical group of tags!')
    const original = testSegment.copy()

    this.afterEach(function() {
      // "Does not mutate"
      assert(original.eq(testSegment), "Expected original.eq(testSegment) to be true")
    })

    describe('applyTags', function() {
      it('applies tags', function () {

        const appliedTags = testSegment.applyTags(['em', 'strong'])
        assert(appliedTags.hasTag('em'))
        assert(appliedTags.hasTag('strong'))

      })
    })
    describe('removeTags', function () {
      it ('removes tags', function () {
        const appliedTags = testSegment.applyTags(['em', 'strong'])
        const removedTags = appliedTags.removeTags(['em'])
        assert(!removedTags.hasTag('em'))
        assert(removedTags.hasTag('strong'))
      })
    })
    describe('toggleTags', function() {
      const appliedTags = testSegment.applyTags(['em', 'strong'])
      const toggled = appliedTags.toggleTags(['em', 'mark'])
      assert(true)

      it('has the toggled on tags', function() {
        assert(toggled.hasTag('mark'))
      })
      it('does not have toggled off tags', function() {
        assert(!toggled.hasTag('em'))

      })
      it('has tags it had originally that were not toggled', function() {
        assert(toggled.hasTag('strong'))
      })
    })
  })

  describe('Context', function() {

    const testContext1 = Context.from(Segment.from(...'Aaa'), Segment.from(...'Bbb'), Segment.from(...'Ccc'))
    const testContext2 = Context.from()
    const testContext3 = Context.from(Segment.from(...'Ddd'), Segment.from(...'Eee'))
    const testContext4 = Context.from(Segment.from(...'Fff'), Segment.from(...'Ggg'))
    const testDoc = Doc.from(testContext1, testContext2, testContext3, testContext4)

    describe('insertBoundary', function() {

      it('creates a new Segment if the context has none before inserting', function () {

        const testContext = Context.from()
        const result = testContext.insertBoundary(0, 'test string')

        assert.strictEqual(testContext.segments.length, 0, 'expect test component to not have any Segment')
        assert.strictEqual(result.segments.length, 1, 'expect result to have a single Segment')
        assert.strictEqual(result.characters.join(''), 'test string')

      })

    })

    describe('indentation', function () {

      it('has a default indentation of 0', function() {
        assert.strictEqual(testContext1.indentation, 0)
      })

      it('clamps indentation to gte 0', function() {

        const cases = [
          testContext1.indent(-1),
          testContext1.indent(5),
          testContext1.indent(-4),
          testContext1.indent(0),
        ]

        cases.forEach( c => assert(c.indentation >= 0))

      })

    })

    describe('updateAttributes', function() {
      it ('updates attributes', function () {
        const result1 = testContext1.updateAttributes({ blockTag: 'pre', indentDelta: 2 })
        assert.strictEqual(result1.block, 'pre')
        assert.strictEqual(result1.indentation, testContext1.indentation + 2)

      })
    })

    describe('Nested Context', function () {

      it('has the expected atoms', function () {

        const expected = 'ABCcAcBcCcDD'
        assert.strictEqual(testNestedContext.atoms.join(''), expected)
        assert.strictEqual(testNestedContext.length, expected.length)
      })

      it('computes the correct boundary locations', function () {
        const bl1 = testNestedContext._locateBoundary(0)
        const topLevel = [ [0,0], [0,1], [1,0], [1,1], [2,0], [2,1], [2,2], [2,3], [2,4], [2,5], [2,6], [2,7], [2,8], [2,9], [2,10], [2,11], [2,12], [2,13], [3,0], [3,1], ]
        for (let i = 0; i < testNestedContext.boundariesLength; i++ ) {
          assert.deepStrictEqual(testNestedContext._locateBoundary(i), topLevel[i])
        }
        const nextLevel = [ 
          [0,0], [0,1], // the letter 'C'
          [1,0], [1,1], [1,2], [1,3], [1,4], [1,5], [1,6], [1,7], [1,8], [1,9], [1, 10], [1, 11], [1, 12] // cA ... cD
        ]
        for (let i = 0; i < testNestedContext.subPieces[2].boundariesLength; i++ ) {
          assert.deepStrictEqual(testNestedContext.subPieces[2]._locateBoundary(i), nextLevel[i])
        }
        const lastLevel = [ 
          [0,0], [0,1], [0,2],
          [1,0], [1,1], [1,2],
          [2,0], [2,1], [2,2],
          [3,0], [3,1], [3,2],
        ]
        for (let i = 0; i < testNestedContext.subPieces[2].subPieces[1].boundariesLength; i++ ) {
          assert.deepStrictEqual(testNestedContext.subPieces[2].subPieces[1]._locateBoundary(i), lastLevel[i])
        }
      })

    })

  })

  describe('Gap', function () {

    const testSegments1 = [
      Segment.from(...'AAA'),
      Segment.from(...'BBB').applyTags(['B']),
      Segment.from(...'CCC'),
    ]
    const testSegments2 = [
      Segment.from(...'DDD'),
      Segment.from(...'EEE'),
    ]
    const testSegments3 = [
      Segment.from(...'FFF'),
    ]
    const testSegments4 = [
      Segment.from(...'GGG'),
    ]
    const testContext1 = Context.from(...testSegments1)
    const testContext2 = Context.from(...testSegments2)
    const testContext3 = Context.from(...testSegments3)
    const testContext4 = Context.from(...testSegments4)

    const gap = new Gap()
    const testDoc = Doc.from(gap, testContext1, gap, testContext2, gap, testContext3, gap, testContext4, gap)
    const tradDoc = Doc.from(testContext1, testContext2, testContext3, testContext4)

    // const result = testDoc.delete(0,9)
    const result2 = tradDoc.delete(0, 9)
    assert(true)

  })

  describe('Doc', function() {

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

    it('is equal to its own split', function() {
      // Docs split and produce another doc, unlike most Section which split into a list of Section (or subclasses of Section)
      const result = doc.splitInterior(5)
      assert(doc.eq(result))
    })

    it('preserves Segment tagging when split', function() {
      const result = doc.splitInterior(5)
      ;[segments];
      const resultSegments = [ ...result.subPieces.map( ctx => [...ctx.subPieces] ) ].flat()

      assert(resultSegments[0]._eqTags(segments[0]))
      assert(resultSegments[1]._eqTags(segments[0]))
      assert(resultSegments[2]._eqTags(segments[1]))
    })

    it('applies tags NAME TBD, TODO', function () {
      const tagged = doc.applyTags(['mark'], 2, 4)

      console.log(tagged)
    })

    describe('parseSerialDoc', function () {
      it('parses JSON serialized Doc into correct Section', function () {

        const serialized = "{\"subPieces\":[{\"subPieces\":[{\"subPieces\":[\"A\",\"a\",\"a\",\"a\",\"a\",\"B\",\"b\",\"b\",\"b\",\"b\"],\"tags\":[]}],\"blockTag\":\"h1\",\"indentationAmount\":0,\"_length\":10,\"_bLength\":11},{\"subPieces\":[{\"subPieces\":[\"C\",\"c\",\"c\",\"c\",\"c\",\"D\",\"d\",\"d\",\"d\",\"d\"],\"tags\":[]}],\"blockTag\":\"p\",\"indentationAmount\":1,\"_length\":10},{\"subPieces\":[{\"subPieces\":[\"E\",\"e\",\"e\",\"e\",\"e\",\"F\",\"f\",\"f\",\"f\",\"f\",\"G\",\"g\",\"g\",\"g\",\"g\"],\"tags\":[]}],\"blockTag\":\"p\",\"indentationAmount\":0,\"_length\":15},{\"subPieces\":[],\"blockTag\":\"p\",\"indentationAmount\":0,\"_length\":0},{\"subPieces\":[{\"subPieces\":[\"H\",\"h\",\"h\",\"h\",\"h\",\"I\",\"i\",\"i\",\"i\",\"🌐\",\"J\",\"j\",\"j\",\"j\",\"j\"],\"tags\":[]}],\"blockTag\":\"h2\",\"indentationAmount\":0,\"_length\":15},{\"subPieces\":[{\"subPieces\":[\"K\",\"k\",\"k\",\"k\",\"k\",\"L\",\"l\",\"l\",\"l\",\"l\"],\"tags\":[]}],\"blockTag\":\"p\",\"indentationAmount\":0,\"_length\":10}],\"_length\":60}"

        const result = Doc.parseSerialDoc(serialized)
        const expectedEq = testDocAlpha

        assert(result.eq(expectedEq))

      })
    })

    describe('write', function() {
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

    describe('delete', function() {
      it('combines contexts when a delete straddles the boundary', function () {

        const result = testDoc.delete(8, 12)

        assert.equal(result.subPieces.length, testDoc.subPieces.length - 1)
      })
      it('combines Context when a delete spans more than one boundary', function() {
        const testDoc2 = Doc.from(testContext1, testContext2, testContext1) // length 30 from [10, 10, 10]
        const result = testDoc2.delete(8, 22) // cut out testContext2, dig in to testContext1 on either side

        assert.equal(result.subPieces.length, testDoc2.subPieces.length - 2)
      })
      it('does not combine if a delete range includes the boundary of a Context, but without cutting into the other Context', function() {
        // Another complicated idea to express. Idea: if you select an entire paragraph, then delete, it should yield essentially an empty context
        // crucially, that should not, then, also combine them. Same if you select from the start of a paragraph to the middle, or from the middle
        // to the end. So long as the selection falls within the boundary of a context it won't join with adjacent ones after the delete.

        const testDoc2 = Doc.from(testContext1, testContext2, testContext1) // length 30 from [10, 10, 10]

        const result_cutAll = testDoc2.delete(10,20)
        const result_cutLeft = testDoc2.delete(10,15)
        const result_cutRight = testDoc2.delete(15,20)

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

    describe('deleteBoundary', function() {

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

        const expected = [ ...original.contexts[2].atoms.slice(0, 5), ...original.contexts[2].atoms.slice(6)]

        assert.deepStrictEqual(result.contexts[2].atoms, expected, "expect result of deleted to match")
        assert.strictEqual(result.contexts[2].segments.length, 3, "expect result to not merge segments")
        assert(result.contexts[2].segments.some(seg => seg.hasTag), "expect result to have 'tag1' tag")

      })
    })

    describe('insert', function() {
      // it ('')
    })

    describe('tag operations', function() {
      //  TODO I need to map character indices to boundary indices. it's not enough to just count the cursor position of the document.
      //    better yet, need to map cursor indices to the correct boundary indicies. e.g we observe all boundaries of Context but only character Boundaries in Segment.


      describe('applyTags', function() {

      })
      describe('removeTags', function() {

      })
      describe('toggleTags', function() {

        it ('toggles on covering a single character', function() {

          // going by cursor position
          const lb = testDocAlpha.cursorToBoundary(25)
          const rb = testDocAlpha.cursorToBoundary(26)

          const result = testDocAlpha.toggleTags(['tag1'], lb, rb)  // covering just the fourth 'e'
          const resultSegments = result.contexts[2].segments

          // assert.strictEqual(resultSegments.length, 3) // should end with three segments
          assert(resultSegments.some(seg => seg.hasTag('tag1')), "Should have applied the tag")

        })
        it ('toggles off covering a single character', function() {

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
      it('updates blocks correctly', function() {
        const newBlock = 'pre'.toLocaleLowerCase()
        const result = testDocAlpha.updateBlocks(newBlock, 14, 38)

        assert(result.contexts.slice(1, 4).every(ctx => ctx.block.toLowerCase() === newBlock), 'expect Contexts covering selection to have new block tag')
        assert(result.contexts.slice(0, 1).every(ctx => ctx.block.toLowerCase() !== newBlock), 'expect Contexts before the selection to not have new block tag')
        assert(result.contexts.slice(4).every(ctx => ctx.block.toLowerCase() !== newBlock), 'expect Contexts after the selection to not have the new block tag')
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

    describe('cursorToBoundary', function() {
      const testDocAlpha2 = Doc.from(
        Context.createContext('p', Segment.createSegment([], 'Eee'), Segment.createSegment([], 'ee'), Segment.createSegment([], 'Fffff')),
        Context.createContext('p', Segment.createSegment([], 'Gg')),
        Context.createContext('p'),
        Context.createContext('p', Segment.createSegment([], 'ggg')),
        Context.createContext('p', Segment.createSegment([], 'Hhh'), Segment.createSegment([], 'hh'), Segment.createSegment([], 'Ii'), Segment.createSegment([], 'iii') ),
      )
      const testDocAlpha3 = Doc.from(
        Context.from(Segment.from(...'Aaa'), Segment.from(...'Bbb')),
        Context.from(Segment.from(...'Ccc'), Segment.from(...'Ddd')),
      )
      it('maps cursor positions correctly', function() {
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

      it('correctly maps cursor from last position to last boundary when the last 2 Contexts have no Segments', function() {
        const testDocAlpha3 = testDocAlpha2.addSubSections(Context.createContext('p'), Context.createContext('p'))

        const lastBoundaryPosition = testDocAlpha3.boundariesLength - 1
        const lastCursorPosition = testDocAlpha3.totalCursorPositions - 1
        const result = testDocAlpha3.cursorToBoundary(lastCursorPosition)

        assert.notStrictEqual(result, 0, "expect to not be equal to the stubbed output")
        assert.strictEqual(result, lastBoundaryPosition, "expect to match last boundary position")

      })

      it('supports favoring left, right boundaries when several are adjacent', function() {
        
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
      it('Has correct granularities', function() {  // TODO test naming

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
            [ 0, 0, 0 ],
            [ 3, 3, 4 ],
            [ 5, 6, 7 ],
            [ 10, 12, 12 ],
            [ 11, 13, 13 ],
            [ 14, 16, 16 ],
            [ 22, 24, 25 ],
            [ 24, 27, 28 ],
            [ testDocAlpha2.totalCursorPositions - 1, testDocAlpha2.boundariesLength - 1, testDocAlpha2.boundariesLength - 1 ]
          ]

          for ( const [ cursor, boundaryLeft, boundaryRight ] of testCases ) {
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

    describe('selectonHasTag', function() {
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
    describe('selectonEntirelyHasTag', function() {
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
            [ 0, 0 ],
            [ 5, 5 ], [ 6, 7 ], [16, 17 ], [ 17, 19 ],
            [24, 26], [25, 27],
            [24, 26], [25, 27],
            [26, 28], [27, 29],
            [28, 30], [30, 32],
            [37, 39], [39, 41],
            [40, 42], [41, 43],
            [ testDocWithNested.totalCursorPositions - 1, testDocWithNested.boundariesLength - 1 ],
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
          for ( const [ input, expectedOutput ] of testCases)
            assert.deepStrictEqual(testDocWithNested.cursorToBoundary(input), expectedOutput)

        })


      })

      describe('predicateSlice', function() {
        it('correctly flattens', function () {

        })
      })

      describe('kindSlice', function() {
        it('grabs all Sections of given kind', function () {

          const seggos = testDocWithNested.kindSlice(Segment.name,18)
          assert(seggos.every(s => s instanceof Segment))

        })
        it('grabs correct portions', function () {

          const seggos = testDocWithNested.kindSlice(Segment.name,18)
          const expectedEq = Segment.from(...'DddddABCcAcBcCcDD')
          assert(Context.from(...seggos).eq(expectedEq))

        })
      })

    })

    it('is a place for me to test', function() {
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
})