'use strict'
import assert from 'assert';

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

    it('is a place for me to test', function() {
      [Segment, Context, Doc, testDoc]

      assert(true)
    })
  })
})