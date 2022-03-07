'use strict'
import assert from 'assert';
import { assertWrappingType } from 'graphql';

const PATH = "/home/henry/dev/scribnet/views"
const MODULE = "Context"
const { Doc, Context, Segment } = await import(`${PATH}/js/scribnet/section/${MODULE}.mjs`)

describe('Context', function() {



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
    const testContext1 = Context.from(...testSegments1)
    const testContext2 = Context.from(...testSegments2)
    const testDoc = Doc.from(testContext1, testContext2)

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