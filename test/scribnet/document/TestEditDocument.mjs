'use strict'
import assert from 'assert';
const PATH = "/home/henry/dev/scribnet/views"

const { default: EditDocument, expose: {} } = await import(`${PATH}/js/scribnet/document/EditDocument.mjs`)
const { Segment, Context, Doc } = await import(`${PATH}/js/scribnet/section/Context.mjs`)

describe('EditDocument', function() {
  const doc = EditDocument.fromBlockContexts(
    [
      Context.createContext('h1', Segment.from(..."Document Title")),
      Context.createContext('p', Segment.from(..."Intro paragraph")),
      Context.createContext('p', Segment.from(..."Body paragraph. It has some longer text.")),
    ]
  )

  describe('selection', function() {
    it ('selected the correct string', function() {
      doc.select(34, 44)
      assert.strictEqual(doc.selection(), "paragraph.")
    })

  })

  describe('applyTag', function() {
    const taggedDoc = Doc.from(
      Context.createContext('h1', Segment.from(..."Document Title")),
      Context.createContext('p', Segment.from(..."Intro paragraph")),
      Context.createContext('p', Segment.from(..."Body paragraph. It has some longer text.")),
    ).applyTags(['strong'], 34, 43)

    it('does not change the content', function() {
      doc.select(34, 43)
      const nextDoc = doc.applyTag('strong')
      assert.strictEqual(nextDoc.toString(), doc.toString())
    })
    it('has the same selection', function() {
      doc.select(34, 43)
      const nextDoc = doc.applyTag('strong')
      assert.strictEqual(nextDoc.anchor, doc.anchor)
      assert.strictEqual(nextDoc.focus, doc.focus)
    })

    it('applies tag correctly', function() {
      doc.select(34, 43)
      const nextDoc = doc.applyTag('strong')
      assert(nextDoc.document.eq(taggedDoc))

    })

  })
})
