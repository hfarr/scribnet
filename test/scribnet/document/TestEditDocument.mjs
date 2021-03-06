'use strict'
import assert from 'assert';

import { parseDoc, printDoc, testAll } from '../../helpers.mjs';

const PATH = "/home/henry/dev/scribnet/views"

const { default: EditDocument, expose: { } } = await import(`${PATH}/js/scribnet/document/EditDocument.mjs`)
const { Segment, Context, Doc } = await import(`${PATH}/js/scribnet/section/index.mjs`)

describe('EditDocument', function () {
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

  describe('selection', function () {
    it('selected the correct string', function () {
      editDoc.select(36, 46)
      assert.strictEqual(editDoc.selection(), "paragraph.")

    })

    it('selects across Context correctly', function () {
      testDocAlpha.select(14, 25)
      assert.strictEqual(testDocAlpha.selection(), 'ccDddddEee')

    })

  })

  describe('applyTag', function () {


    it('does not change the content', function () {
      // TODO remove/rewrite
      editDoc.select(34, 43)
      const nextDoc = editDoc.applyTag('strong')
      assert.strictEqual(nextDoc.toString(), editDoc.toString())
    })
    it('has the same selection', function () {
      // TODO remove/rewrite
      editDoc.select(34, 43)
      const nextDoc = editDoc.applyTag('strong')
      assert.strictEqual(nextDoc.anchor, editDoc.anchor)
      assert.strictEqual(nextDoc.focus, editDoc.focus)
    })

    it('has the tag after applying', function () {
      testDocAlpha.select(24, 26)
      const result = testDocAlpha.applyTag('tag1')
      assert(!docHasTagAnywhere(testDocAlpha, 'tag1'), "Expected test doc to start without 'tag1' tag")
      assert(docHasTagAnywhere(result, 'tag1'), "Expected document result of applying 'tag1' to contain 'tag1'")
    })
    it('applies the tag in the correct place', function () {
      testDocAlpha.select(24, 26)
      const resultDoc = testDocAlpha.applyTag('tag1').document
      assert(resultDoc.contexts[2].segments[1].hasTag('tag1'), "expect correct segment to have tag")

      const resultDivisionOfStrings = resultDoc.contexts[2].segments.map(s => s.atoms.join(''))
      // the middle 'ee' segment is the segment to which the tag is applied. If the tagged portion were different, the resulting
      // division of the segments into the strings they represent would not match the array.
      assert.deepStrictEqual(resultDivisionOfStrings, ['Ee', 'ee', 'eFffffGgggg'], "expect tagged portion to cover correct piece")
    })

  })

  describe('toggleTag', function () {
    it('toggles on', function () {
      testDocAlpha.select(24, 26)
      const result = testDocAlpha.toggleTag('tag1')
      assert(!docHasTagAnywhere(testDocAlpha, 'tag1'), "Expected test doc to start without 'tag1' tag")
      assert(docHasTagAnywhere(result, 'tag1'), "Expected document result of toggling 'tag1' to contain 'tag1'")
    })
    it('toggles off', function () {
      testDocAlpha.select(24, 26)
      const original = testDocAlpha.applyTag('tag1')
      const result = original.toggleTag('tag1')
      assert(docHasTagAnywhere(original, 'tag1'), "Expected original doc to start with 'tag1' tag")
      assert(!docHasTagAnywhere(result, 'tag1'), "Expected result doc to not have 'tag1' tag")
    })
    it('toggles on and off', function () {
      testDocAlpha.select(24, 26)
      const result1 = testDocAlpha.toggleTag('tag1')
      const result2 = result1.toggleTag('tag1')
      assert(docHasTagAnywhere(result1, 'tag1'), "Expected result1 to have 'tag1' tag")
      assert(!docHasTagAnywhere(result2, 'tag1'), "Expected result2 to not have 'tag1' tag")
    })
    it('works across Context boundaries', function () {
      testDocAlpha.select(14, 25)
      const result = testDocAlpha.toggleTag('tag1')
      assert(docHasTagAnywhere(result, 'tag1'), 'expect result to have \'tag1\'')
    })
    it('applies tag if selection has mix of tagged and untagged Segments', function () {
      testDocAlpha.select(24, 26)
      const original = testDocAlpha.applyTag('tag1')
      const lb = 25
      const rb = 32
      original.select(lb, rb)
      const result = original.toggleTag('tag1')
      assert(result.document.selectionEntirelyHasTag('tag1', lb, rb), 'expect entire selection to have tag1')
    })
  })

  describe('write', function () {
    it('writes in the expected location', function () {
      testDocAlpha.select(33)
      const result = testDocAlpha.write('_')

      const expected = 'AaaaaBbbbbCccccDddddEeeeeFffffG_ggggHhhhhIiii????JjjjjKkkkkLllll'

      assert.deepStrictEqual(result.toString(), expected, 'expect strings to match')
    })

    it('inserts into expected location after toggling a tag from earlier location', function () {
      testDocAlpha.select(24, 26)
      const result1 = testDocAlpha.applyTag('tag1')
      result1.select(38)  // cursor resting on the empty context from testDocAlpha
      const result2 = result1.write('a')

      assert.deepStrictEqual(result2.document.contexts[2].atoms, 'EeeeeFffffGgggg'.split(''), "expect writing after toggling a tag to write to correct location")
      assert.deepStrictEqual(result2.document.contexts[3].atoms, ['a'], "expect writing after toggling a tag to write to correct location")

    })
  })

  describe('enterNewline', function () {

    // it('advances cursor position to start of new context', function () {
    it('breaks at every possible cursor location and advances cursor position to start of new context', function () {

      const testPosition = pos => {
        testDocAlpha.select(pos)
        const result = testDocAlpha.enterNewline()
        assert.strictEqual(result.cursorOffset, pos + 1, "expect cursor position in result to be one greater than start position")
      }

      const totalCursorPositions = testDocAlpha.document.contexts.reduce((p, c) => p + c.length + 1, 0)
      for (let i = 0; i < totalCursorPositions; i++) {
        testPosition(i)
      }
    })

    it('sets the new element to a paragraph block', function () {
      testDocAlpha.select(8)
      const result = testDocAlpha.enterNewline()

      assert.notStrictEqual(testDocAlpha.document.contexts[0].block, 'p', "expect first block to not be paragraph")
      assert.strictEqual(result.document.contexts[1].block, 'p', "expect second block to be paragraph")
    })
  })

  describe('delete', function () {
    it('deletes correctly', function () {

      const testCases = [
        {
          func: x => { x.select(22); return x.delete() },
          original: `h1<'A List'>ul<li<p<'A'>>li<p<'B'>ul<li<ul<li<p<'bA'>>>>li<p<'bB'>>>>li<p<'C'>>>p<'whoa'>p<'there'>`,
          expected: `h1<'A List'>ul<li<p<'A'>>li<p<'B'>ul<li<ul<li<p<'bA'>>>>li<p<'bB'>>>>li<p<'C'>>>p<'who'>p<'there'>`,
        }
      ]

      const testOne = ({ func, original, expected }, testCaseNum) => {
        const actual = printDoc(func(EditDocument.fromDocSection(parseDoc(original))).document)
        const expectedStr = printDoc(parseDoc(expected))
        assert.strictEqual(actual, expectedStr, `[Test case ${testCaseNum}] Expect strict equality`)
      }

      testAll(testOne, testCases)

    })

    it('deletes single boundary correctly when cursor positioned after a Context with more than one segment', function () {
      // a mouthful of a test function. But a peculiar edge case we want to allow for.
      testDocAlpha.select(24, 26)
      const result1 = testDocAlpha.applyTag('tag1')
      result1.select(38)  // cursor resting on the empty context from testDocAlpha
      const result2 = result1.delete()

      assert.strictEqual(result2.document.contexts.length, testDocAlpha.document.contexts.length - 1, "expect delete on the boundary of an empty context to remove that context")

    })

    it('preserves tags of first Segment in a Context when merging with the Context just before', function () {
      testDocAlpha.select(55, 58)
      const original = testDocAlpha.applyTag('tag1')
      original.select(55 - 1) // - 1 because behavior of delete on collapsed is to select boundary under cursor and one immediately after it (e.g becoming deleteBoundary(54, 55))
      const result = original.delete()

      assert(docHasTagAnywhere(original, 'tag1'))
      assert(docHasTagAnywhere(result, 'tag1'), 'expect result to have tag1')
    })

    it('preserves tags of segments involved in delete', function () {
      // TODO my tests for EditDoc know a little too much about the underlying "Doc". For now... that is okay. What I need is more "query" capabilities to ask
      //  an edit doc things about itself so I don't have to unpack its guts.
      testDocAlpha.select(24, 27)
      const temp = testDocAlpha.applyTag('tag1')
      temp.select(27, 30)
      const original = temp.applyTag('tag2')

      original.select(27) // - 1 because behavior of delete on collapsed is to select boundary under cursor and one immediately after it (e.g becoming deleteBoundary(54, 55))
      const result = original.delete()

      assert(docHasTagAnywhere(result, 'tag1'), "expected result to have 'tag1'")
      assert(docHasTagAnywhere(result, 'tag2'), "expected result to have 'tag2'")
      assert.deepStrictEqual(result.document.contexts[2].atoms, 'EeeeeffffGgggg'.split(''), "Expect correct character to be deleted")

    })
  })
})
