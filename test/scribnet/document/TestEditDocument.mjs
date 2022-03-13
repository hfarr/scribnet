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

  describe('selection', function() {
    it ('selected the correct string', function() {
      editDoc.select(34, 44)
      assert.strictEqual(editDoc.selection(), "paragraph.")
    })

  })

  describe('applyTag', function() {
    const taggedDoc = Doc.from(
      Context.createContext('h1', Segment.from(..."Document Title")),
      Context.createContext('p', Segment.from(..."Intro paragraph")),
      Context.createContext('p', Segment.from(..."Body paragraph. It has some longer text.")),
    ).applyTags(['strong'], 34, 43)

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

    it('applies tag correctly', function() {
      editDoc.select(34, 43)
      const nextDoc = editDoc.applyTag('strong')
      assert(nextDoc.document.eq(taggedDoc))

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
