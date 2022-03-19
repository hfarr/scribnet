'use strict'
import assert from 'assert';
const PATH = "/home/henry/dev/scribnet/views"

const { default: EditDocument, expose: {} } = await import(`${PATH}/js/scribnet/document/EditDocument.mjs`)
const { Segment, Context, Doc } = await import(`${PATH}/js/scribnet/section/Context.mjs`)

describe('EditDocument', function() {
  const editDoc = EditDocument.fromBlockContexts(
    [
      Context.createContext('h1', Segment.from(..."Document Title")),
      Context.createContext('p', Segment.from(..."Intro paragraph")),
      Context.createContext('p', Segment.from(..."Body paragraph. It has some longer text.")),
    ]
  )

  const testEditDoc = EditDocument.fromBlockContexts([
    Context.createContext('h1', Segment.from(...'AaaaaBbbbb')),
    Context.createContext('p', Segment.from(...'CccccDdddd')),
    Context.createContext('p', Segment.from(...'EeeeeFffffGgggg')),
    Context.createContext('h1', Segment.from(...'HhhhhIiii\u{1F310}Jjjjj')),
    Context.createContext('p', Segment.from(...'KkkkkLllll')),
  ])
  const testDocAlpha = EditDocument.fromBlockContexts([
    Context.createContext('h1', Segment.createSegment([], 'AaaaaBbbbb')),
    Context.createContext('p', Segment.createSegment([], 'CccccDdddd')),
    Context.createContext('p', Segment.createSegment([], 'EeeeeFffffGgggg')),
    Context.createContext('p'),
    Context.createContext('h1', Segment.createSegment([], 'HhhhhIiii\u{1F310}Jjjjj')),
    Context.createContext('p', Segment.createSegment([], 'KkkkkLllll')),
  ])


  const docHasTagAnywhere = (doc, tag) => {
    return doc.document.contexts.some(ctx => ctx.segments.some(seg => seg.hasTag(tag)))
  }

  describe('selection', function() {
    it ('selected the correct string', function() {
      editDoc.select(34, 44)
      assert.strictEqual(editDoc.selection(), "paragraph.")
    })

  })

  describe('applyTag', function() {


    it('does not change the content', function() {
      editDoc.select(34, 43)
      const nextDoc = editDoc.applyTag('strong')
      assert.strictEqual(nextDoc.toString(), editDoc.toString())
    })
    it('has the same selection', function() {
      editDoc.select(34, 43)
      const nextDoc = editDoc.applyTag('strong')
      assert.strictEqual(nextDoc.anchor, editDoc.anchor)
      assert.strictEqual(nextDoc.focus, editDoc.focus)
    })

    it('has the tag after applying', function() {
      testDocAlpha.select(24, 26)
      const result = testDocAlpha.applyTag('tag1')
      assert(!docHasTagAnywhere(testDocAlpha, 'tag1'), "Expected test doc to start without 'tag1' tag")
      assert(docHasTagAnywhere(result, 'tag1'), "Expected document result of applying 'tag1' to contain 'tag1'")
    })
    it('applies the tag in the correct place', function() {
      testDocAlpha.select(24, 26)
      const resultDoc = testDocAlpha.applyTag('tag1').document
      assert(resultDoc.contexts[2].segments[1].hasTag('tag1'), "expect correct segment to have tag")
      
      const resultDivisionOfStrings = resultDoc.contexts[2].segments.map(s => s.atoms.join(''))
      // the middle 'ee' segment is the segment to which the tag is applied. If the tagged portion were different, the resulting
      // division of the segments into the strings they represent would not match the array.
      assert.deepStrictEqual(resultDivisionOfStrings, ['Ee', 'ee', 'eFffffGgggg'], "expect tagged portion to cover correct piece")
    })

  })

  describe('write', function() {
    it('writes in the expected location', function() {
      const copy = testEditDoc.copy()
      copy.select(24, 24)
      const result = copy.write('_')

      const charIndex = 24 - 2  // left shift two to account for the two +1 the cursor position gets by being in the context at index 2
      const expected = testEditDoc.toString().slice(0, charIndex) + '_' + testEditDoc.toString().slice(charIndex)

      assert.deepStrictEqual(result.toString(), expected)
    })
  })
})
