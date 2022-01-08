'use strict'

const PATH = "/home/henry/dev/scribnet/views"
const { expose } = await import(`${PATH}/js/scribnet/document/Document.mjs`)

import assert from 'assert';


function arrEq() {

}


describe('hooks', function() {
  before(function() {
    const { Segment, applyTag } = expose

    const basicSegment = Segment.taggedSegment('p', ...['A test segment'])

  })
  after(function() {

  })
})

describe('Segment', function() {
  const { Segment } = expose
  const basicSegment = Segment.taggedSegment(['p'], 'A test segment')
  const segmentEmStrong = Segment.taggedSegment(['p', 'em', 'strong'], ...['A test segment'])

  describe('Segment.taggedSegment', function() {

  })

  describe('applyTags', function() {
    
    it('should add the tag if not present', function() {
      assert.strictEqual(basicSegment.applyTags(['strong']).tags.includes('strong'), true)
    })

    it('has the same characters', function() {
      assert.deepStrictEqual(basicSegment.applyTags(['em', 'strong']).characters, basicSegment.characters)
    })

    it('should not add the tag if already present', function() {
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

  describe('replaceTags', function() {
    const replaced = basicSegment.replaceTags(['h1', 'em'])
    it ('should have the new tags', function() {
      assert(replaced.tags.includes('h1'))
      assert(replaced.tags.includes('em'))
    })
    it ('should remove old tags', function() {
      assert(!replaced.tags.includes('p'))
    })
  })


  describe('<Segment instance>.applyTag', function() {
  })
})

describe('ListSegment', function() {
  const { ListSegment, Segment } = expose
  const listSeg = ListSegment.from(
    Segment.taggedSegment(['h1'], 'Titular Segment'),
    Segment.taggedSegment(['p'], 'body text. Wonderful'),
    Segment.taggedSegment(['p', 'em'], 'ly emphasized'),
    Segment.taggedSegment(['p'], '! Boldly '),
    Segment.taggedSegment(['p', 'strong'], 'go'),
    Segment.taggedSegment(['p'], ' away.'),
  )
  it('has the characters of its components combined', function() {
    assert.deepStrictEqual(
      listSeg.characters,
      "Titular Segmentbody text. Wonderfully emphasized! Boldly go away."
    )
  })

  describe('applyTags', function() {
    const listSeg = ListSegment.from(
      Segment.taggedSegment(['h1'], 'Test Content'),
      Segment.taggedSegment(['p'], 'Bare text then'),
      Segment.taggedSegment(['p', 'em'], 'some emphasis'),
      Segment.taggedSegment(['p'], 'BUT not here'),
    )
    const boldApply = listSeg.applyTags(['strong'], 31, 44)
    const boldApplyExpected = ListSegment.from(
      Segment.taggedSegment(['h1'], 'Test Content'),
      Segment.taggedSegment(['p'], 'Bare text then'),
      Segment.taggedSegment(['p', 'em'], 'some '),
      Segment.taggedSegment(['p', 'em', 'strong'], 'emphasis'),
      Segment.taggedSegment(['p', 'strong'], 'BUT'),
      Segment.taggedSegment(['p'], ' not here'),
    )

    it('applies tags correctly', function() {
      // console.log(boldApply)
      assert(boldApply.eq(boldApplyExpected))
      // assert.deepStrictEqual(boldApply[0]?.characters, 'Test Content')
      // assert.deepStrictEqual(boldApply[1]?.characters, 'Bare text then')
      // assert.deepStrictEqual(boldApply[2]?.characters, 'some ')
      // assert.deepStrictEqual(boldApply[3]?.characters, 'emphasis')
      // assert.deepStrictEqual(boldApply[4]?.characters, 'BUT')
      // assert.deepStrictEqual(boldApply[5]?.characters, ' not here')
    }) 
  })

  describe('_locate', function() {

  })
})
