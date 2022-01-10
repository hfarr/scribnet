'use strict'
import assert from 'assert';
const PATH = "/home/henry/dev/scribnet/views"

const { default: EditDocument, expose: {} } = await import(`${PATH}/js/scribnet/document/EditDocument.mjs`)
const { Segment, ListSegment } = await import(`${PATH}/js/scribnet/document/Segment.mjs`)

// describe('hooks', function () {
//   before(function () {
//     const { Segment, applyTag } = expose

//     const basicSegment = Segment.taggedSegment('p', ...['A test segment'])

//   })
//   after(function () {

//   })
// })

describe('EditDocument', function() {
  const doc = EditDocument.fromListSegment(
    ListSegment.from(
      Segment.taggedSegment(['h1'], "Document Title"),
      Segment.taggedSegment(['p'], "Intro paragraph"),
      Segment.taggedSegment(['p'], "Body paragraph. It has some longer text."),
    )
  )

  describe('selection', function() {
    it ('selected the correct string', function() {
      doc.select(34, 44)
      assert.strictEqual(doc.selection(), "paragraph.")
    })

  })

  describe('applyTag', function() {
    const tagged = ListSegment.from(
      Segment.taggedSegment(['h1'], "Document Title"),
      Segment.taggedSegment(['p'], "Intro paragraph"),
      Segment.taggedSegment(['p'], "Body paragraph. It has some longer text."),
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
      assert(nextDoc.text.eq(tagged), nextDoc, tagged)

    })

  })
})
