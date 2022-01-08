'use strict'

const PATH = "/home/henry/dev/scribnet/views"
const { expose } = await import(`${PATH}/js/scribnet/document/Document.mjs`)

import assert from 'assert';


function arrEq() {

}


describe('hooks', function() {
  before(function() {
    const { Segment, applyTag } = expose

    const basicSegment = new Segment('p', ...['A test segment'])

  })
  after(function() {

  })
})

describe('Segment', function() {
  const { Segment } = expose

  describe('applyTag', function() {
    const { applyTag } = expose
    const basicSegment = new Segment(['p'], ...'A test segment')
    const segmentEmStrong = new Segment(['p', 'em', 'strong'], ...['A test segment'])
    
    it('should add the tag if not present', function() {
      assert.strictEqual(applyTag('strong', basicSegment).tags.includes('strong'), true)
    })

    it('should not add the tag if already present', function() {
      // const basicSegment = new Segment('p', ...['A test segment'])
      // const segmentEmStrong = basicSegment.reTag(['p', 'em', 'strong'])
      // Not exactly testing equality of the array, but if the lengths were different that would signal. This is bad testing hygene, hmm?
      assert.strictEqual(applyTag('em', segmentEmStrong).tags.length, segmentEmStrong.tags.length)
      assert.strictEqual(applyTag('strong', segmentEmStrong).tags.length, segmentEmStrong.tags.length)
    })
  })

  describe('applyTagToSegments', function() {
    const { applyTagToSegments } = expose
    const segments = [
      new Segment(['h1'], ...'Test Content'),
      new Segment(['p'], ...'Bare text then'),
      new Segment(['p', 'em'], ...'some emphasis'),
      new Segment(['p'], ...'BUT not here'),
    ]

    it('slices segments correctly', function() {
      const boldApply = applyTagToSegments('strong', segments, [2, 5], [3, 3])
      console.log(boldApply)
      assert.deepStrictEqual(boldApply[0]?.characters, ...'Test Content')
      assert.deepStrictEqual(boldApply[1]?.characters, ...'Bare text then')
      assert.deepStrictEqual(boldApply[2]?.characters, ...'some ')
      assert.deepStrictEqual(boldApply[3]?.characters, ...'emphasis')
      assert.deepStrictEqual(boldApply[4]?.characters, ...'BUT')
      assert.deepStrictEqual(boldApply[5]?.characters, ...' not here')
    }) 

  })

  describe('<Segment instance>.reTag', function() {
    const basicSegment = new Segment(['p'], ...'A test segment')
    const retagged = basicSegment.reTag(['h1', 'strong', 'mark'])
    it('has the same characters', function() {
      assert.deepStrictEqual(basicSegment.characters, retagged.characters)
    })

    it('has the new tags', function() {
      assert.deepStrictEqual(retagged.tags, ['h1', 'strong', 'mark'])
    })
  })
})
