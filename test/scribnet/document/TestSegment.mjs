'use strict'
import assert from 'assert';
const PATH = "/home/henry/dev/scribnet/views"
const MODULE = "Segment"
const { Segment, ListSegment } = await import(`${PATH}/js/scribnet/document/${MODULE}.mjs`)

describe('Segment', function () {
  const basicSegment = Segment.taggedSegment(['p'], 'A test segment')
  const segmentEmStrong = Segment.taggedSegment(['p', 'em', 'strong'], ...['A test segment'])

  describe('Segment.taggedSegment', function () {

  })

  describe('hasTags', function() {
    it('ignores case', function() {
      assert(basicSegment.hasTag('p') && basicSegment.hasTag('P'))
      assert(segmentEmStrong.hasTag('em') && segmentEmStrong.hasTag('EM'))
      assert(!segmentEmStrong.hasTag('h1') && !segmentEmStrong.hasTag('H1'))
    })

    it('returns false for tags that are not present', function() {
      assert(!segmentEmStrong.hasTag('H1'))
      assert(!basicSegment.hasTag('PRE'))
    })
  })

  describe('applyTags', function () {

    it('should add the tag if not present', function () {
      assert.strictEqual(basicSegment.applyTags(['strong']).hasTag('strong'), true)
    })

    it('has the same characters', function () {
      assert.deepStrictEqual(basicSegment.applyTags(['em', 'strong']).characters, basicSegment.characters)
    })

    it('should not add the tag if already present', function () {
      // const basicSegment = Segment.taggedSegment('p', ...['A test segment'])
      // Not exactly testing equality of the array, but if the lengths were different that would signal. This is bad testing hygene, hmm?
      // Keeping length and not using strictDeepEqual because we do not require anything about the order of the tags,
      // and I might change it to a Set. In a sense this is almost a test of algebraic properties but I don't want to test the internals,
      // its an interface, but I could test that the lists have the same elements. For that I'd want to build out re-useable set
      // comparison functions 
      assert.strictEqual(segmentEmStrong.applyTags(['em']).tags.length, segmentEmStrong.tags.length)
      assert.strictEqual(segmentEmStrong.applyTags(['strong']).tags.length, segmentEmStrong.tags.length)
    })
  })

  describe('replaceTags', function () {
    const replaced = basicSegment.replaceTags(['h1', 'em'])
    it('should have the new tags', function () {
      assert(replaced.hasTag('h1'))
      assert(replaced.hasTag('em'))
    })
    it('should remove old tags', function () {
      assert(!replaced.hasTag('p'))
    })
  })

  // describe('split', function() {

  //   it('should ')
  // })

  describe('<Segment instance>.applyTag', function () {
  })
})

describe('ListSegment', function () {
  const listSeg1 = ListSegment.from(
    Segment.taggedSegment(['h1'], 'Titular Segment'),
    Segment.taggedSegment(['p'], 'body text. Wonderful'),
    Segment.taggedSegment(['p', 'em'], 'ly emphasized'),
    Segment.taggedSegment(['p'], '! Boldly '),
    Segment.taggedSegment(['p', 'strong'], 'go'),
    Segment.taggedSegment(['p'], ' away.'),
  )

  const listSeg2 = ListSegment.from(
    Segment.taggedSegment(['h1'], 'Test Content'),
    Segment.taggedSegment(['p'], 'Bare text then'),
    Segment.taggedSegment(['p', 'em'], 'some emphasis'),
    Segment.taggedSegment(['p'], 'BUT not here'),
  )
  it('has the characters of its components combined', function () {
    assert.deepStrictEqual(
      listSeg1.characters.join(''),
      "Titular Segmentbody text. Wonderfully emphasized! Boldly go away."
    )
  })

  describe('split', function () {
    it('has one more segment when split', function () {
      for (let i = 0; i <= listSeg1.length; i++) {
        const expected = listSeg1.segments.length + 1
        const actual = listSeg1.split(i).segments.length
        assert(actual === expected, `Failed for listSeg1 segment ${i}. Actual length ${actual}, expected ${expected}`)
      }
      for (let i = 0; i <= listSeg2.length; i++) {
        const expected = listSeg2.segments.length + 1
        const actual = listSeg2.split(i).segments.length
        assert(actual === expected, `Failed for listSeg2 segment ${i}. Actual length ${actual}, expected ${expected}`)
      }
    })
  })

  describe('applyTags', function () {
    const boldApply = listSeg2.applyTags(['strong'], 31, 42)
    const boldApplyExpected = ListSegment.from(
      Segment.taggedSegment(['h1'], 'Test Content'),
      Segment.taggedSegment(['p'], 'Bare text then'),
      Segment.taggedSegment(['p', 'em'], 'some '),
      Segment.taggedSegment(['p', 'em', 'strong'], 'emphasis'),
      Segment.taggedSegment(['p', 'strong'], 'BUT'),
      Segment.taggedSegment(['p'], ' not here'),
    )

    it('applies tags correctly', function () {
      assert(boldApply.eq(boldApplyExpected))
    })
  })

  describe('_locate', function () {

  })
})