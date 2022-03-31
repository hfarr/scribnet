
'use strict'
import assert from 'assert';

const PATH = "/home/henry/dev/scribnet/views"
const MODULE = "Context"
const { Doc, Context, MixedContext, Segment, Gap } = await import(`${PATH}/js/scribnet/section/${MODULE}.mjs`)


describe('Segment', function () {

  const testSegment = Segment.from(...'I am the string belonging to a section. I render with a logical group of tags!')
  const original = testSegment.copy()

  this.afterEach(function () {
    // "Does not mutate"
    assert(original.eq(testSegment), "Expected original.eq(testSegment) to be true")
  })

  describe('applyTags', function () {
    it('applies tags', function () {

      const appliedTags = testSegment.applyTags(['em', 'strong'])
      assert(appliedTags.hasTag('em'))
      assert(appliedTags.hasTag('strong'))

    })
  })
  describe('removeTags', function () {
    it('removes tags', function () {
      const appliedTags = testSegment.applyTags(['em', 'strong'])
      const removedTags = appliedTags.removeTags(['em'])
      assert(!removedTags.hasTag('em'))
      assert(removedTags.hasTag('strong'))
    })
  })
  describe('toggleTags', function () {
    const appliedTags = testSegment.applyTags(['em', 'strong'])
    const toggled = appliedTags.toggleTags(['em', 'mark'])
    assert(true)

    it('has the toggled on tags', function () {
      assert(toggled.hasTag('mark'))
    })
    it('does not have toggled off tags', function () {
      assert(!toggled.hasTag('em'))

    })
    it('has tags it had originally that were not toggled', function () {
      assert(toggled.hasTag('strong'))
    })
  })
})