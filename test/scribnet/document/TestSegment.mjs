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

  describe('hasTags', function () {
    it('ignores case', function () {
      assert(basicSegment.hasTag('p') && basicSegment.hasTag('P'))
      assert(segmentEmStrong.hasTag('em') && segmentEmStrong.hasTag('EM'))
      assert(!segmentEmStrong.hasTag('h1') && !segmentEmStrong.hasTag('H1'))
    })

    it('returns false for tags that are not present', function () {
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

  describe('removeTags', function () {
    it('should yield a segment without the removed tags', function () {
      assert(!segmentEmStrong.removeTags(['em']).hasTag('em'))
      assert(!segmentEmStrong.removeTags(['p', 'strong']).hasTag('p'))
      assert(!segmentEmStrong.removeTags(['p', 'strong']).hasTag('strong'))
    })

    it('should leave in place non-removed tags', function () {
      assert(segmentEmStrong.removeTags(['em']).hasTag('p'))
      assert(segmentEmStrong.removeTags(['em']).hasTag('strong'))
    })

    it('should not change the original', function () {
      const copied = segmentEmStrong.copy()
      segmentEmStrong.removeTags(['em']).hasTag('em')
      assert(segmentEmStrong.eq(copied))
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

  // yeah this is just. like "XOR" between two sets (S1 u S2) - (S1 n S2)
  // highly suggestive we oughta kick it up a level of abstraction. I'm
  // fairly committed to implementing all these operations though.
  describe('toggleTags', function () {
    const tagsToToggle = ['em', 'mark', 'span']
    it('adds and removes tags', function () {
      const toggled = segmentEmStrong.toggleTags(tagsToToggle)
      assert(!toggled.hasTag('em'))
      assert(toggled.hasTag('mark'))
      assert(toggled.hasTag('span'))
    })

    it('is self invertible', function () {
      const twiceToggled = segmentEmStrong.toggleTags(tagsToToggle).toggleTags(tagsToToggle)
      assert(segmentEmStrong.eq(twiceToggled))
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

  const listSeg2 = ListSegment.from(                      // cursors indices
    Segment.taggedSegment(['h1'], 'Test Content'),        // 0 - 12
    Segment.taggedSegment(['p'], 'Bare text then'),       // 12 - 26
    Segment.taggedSegment(['p', 'em'], 'some emphasis'),  // 26 - 39
    Segment.taggedSegment(['p'], 'BUT not here'),         // 39 - 51
  )
  const boldApplyExpected = ListSegment.from(
    Segment.taggedSegment(['h1'], 'Test Content'),
    Segment.taggedSegment(['p'], 'Bare text then'),
    Segment.taggedSegment(['p', 'em'], 'some '),
    Segment.taggedSegment(['p', 'em', 'strong'], 'emphasis'),
    Segment.taggedSegment(['p', 'strong'], 'BUT'),
    Segment.taggedSegment(['p'], ' not here'),
  )
  const mixedTagSegments = listSeg2.applyTags(['em'], 39, 42).applyTags(['em'], 47, 51)
  it('has the characters of its components combined', function () {
    assert.deepStrictEqual(
      listSeg1.characters.join(''),
      "Titular Segmentbody text. Wonderfully emphasized! Boldly go away."
    )
  })

  describe('split', function () {
    it('does not change the length of the segment', function () {
      const checkLen = seg => {
        for (let i = 0; i <= seg.length; i++) {
          const expected = seg.length
          const actual = seg.split(i).length
          assert(actual === expected, `Failed for segment ${seg} splitting on ${i}. Actual length ${actual}, expected ${expected}`)
        }

      }
      checkLen(listSeg1)
      checkLen(listSeg2)
      checkLen(mixedTagSegments)
    })
    it('is creates an equivalent segment ', function () {
      const checkEq = seg => {
        for (let i = 0; i <= seg.length; i++) {
          assert(seg.eq(seg.split(i)), `Failed for seg ${seg}.`)
        }
      }
      checkEq(listSeg1)
      checkEq(listSeg2)
      checkEq(mixedTagSegments)
    })
    it('has one more segment when splitting creates non-empty segments', function () {
      // TODO this test describes an implementation detail, but in a sense, maybe we do
      // want to keep this notion. If splitting never created new segments other tests
      // wouldn't be sufficient to catch that error. Still getting the hang of writing
      // these tests.
      const checkLenSegments = seg => {
        // empty segments are created when splitting on the boundaries of segments
        // then, everywhere else an *additional* segment should be created.
        // so, we test between boundaries.
        let offset = 0;
        for (const segLength of seg.segments.map(seg => seg.length)) {
          for (let i = offset + 1; i < offset + segLength; i++) {
            const expected = seg.segments.length + 1
            const actual = seg.split(i).segments.length
            assert(actual === expected, `Failed for segment ${seg}, splitting on ${i}. Actual amount of segments ${actual}, expected ${expected}`)
          }
          offset += segLength
        }

      }
      checkLenSegments(listSeg1)
      checkLenSegments(listSeg2)
      checkLenSegments(mixedTagSegments)
    })
  })

  describe('applyTags', function () {
    const boldApply = listSeg2.applyTags(['strong'], 31, 42)

    it('applies tags correctly', function () {
      assert(boldApply.eq(boldApplyExpected))
    })
  })

  describe('delete', function () {

    it('removes the characters', function () {
      const deleted = listSeg2.delete(17, 22)
      // const expected = 
      assert(deleted.characters.join('') === "Test ContentBare thensome emphasisBUT not here")
    })
  })

  describe('insert', function () {
    it('writes the text', function () {
      const inserted = listSeg2.insert(22, 'and this text, ')
      assert(inserted.characters.join('') === "Test ContentBare text and this text, thensome emphasisBUT not here")
    })
  })

  describe('toggleTags', function () {
    it('applies tags if any component segment lacks the tag', function () {
      const expected_1 = ListSegment.from(
        Segment.taggedSegment(['h1'], 'Test Content'),
        Segment.taggedSegment(['p'], 'Bare text then'),
        Segment.taggedSegment(['p', 'em'], 'so'),
        Segment.taggedSegment(['p', 'em', 'strong'], 'me '),
        Segment.taggedSegment(['p', 'em', 'strong'], 'emphasis'),
        Segment.taggedSegment(['p', 'strong'], 'BUT'),
        Segment.taggedSegment(['p'], ' not here'),
      )
      const expected_2 = ListSegment.from(
        Segment.taggedSegment(['h1'], 'Test Content'),
        Segment.taggedSegment(['p'], 'Bare text then'),
        Segment.taggedSegment(['p', 'em'], 'some '),
        Segment.taggedSegment(['p', 'em', 'strong'], 'emphasis'),
        Segment.taggedSegment(['p', 'strong'], 'BUT'),
        Segment.taggedSegment(['p', 'strong'], ' not'),
        Segment.taggedSegment(['p'], ' here'),
      )
      const expected_3 = ListSegment.from(
        Segment.taggedSegment(['h1'], 'Test Content'),        // 0 - 12
        Segment.taggedSegment(['p'], 'Bare text then'),       // 12 - 26
        Segment.taggedSegment(['p', 'em'], 'some emphasis'),  // 26 - 39
        Segment.taggedSegment(['p', 'em'], 'BUT'),
        Segment.taggedSegment(['p', 'em'], ' not '),
        Segment.taggedSegment(['p', 'em'], 'here'),
      )

      // does this overprescribe how tag applying works? like, expected the equality to the above is 
      // to describe, or prescribe, the implementation. When a valid implmentation could, for example,
      // merge adjacent Segments with equivalent tagging. This is the part I struggle with when
      // writing tests.
      assert(boldApplyExpected.toggleTags(['strong'], 28, 42).eq(expected_1))
      assert(boldApplyExpected.toggleTags(['strong'], 31, 46).eq(expected_2))
      assert(mixedTagSegments.toggleTags(['em'], 42, 47).eq(expected_3))
      // assert(boldApplyExpected.applyTags(['strong'], 28, 42).segments.slice(3, 6).every(s => s.hasTag('strong')))
      // assert(boldApplyExpected.applyTags(['strong'], 31, 46).segments.slice(4, 7).every(s => s.hasTag('strong')))
      // assert(mixedTagSegments.applyTags(['em'], 47, 51).segments.slice(3,6).every(s => s.hasTag('strong')))
    })

    it('is removes tags if ALL segments have the tag', function () {
      const boldApplied = boldApplyExpected.toggleTags(['strong'], 28, 42)
      assert(boldApplied.toggleTags(['strong'], 28, 42).eq(boldApplyExpected.removeTags(['strong'], 28, 42)))
      // assert(boldApplyExpected.toggleTags(['strong'], 31, 46).toggleTags(['strong'], 31, 46).eq(boldApplyExpected))
      // assert(mixedTagSegments.toggleTags(['em'], 42, 47).toggleTags(['em'], 42, 47).eq(mixedTagSegments))

    })
  })


  describe('_locate', function () {

  })
})