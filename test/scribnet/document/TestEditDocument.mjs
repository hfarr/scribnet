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
})
