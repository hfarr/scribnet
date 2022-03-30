'use strict'
import assert from 'assert';
const PATH = "/home/henry/dev/scribnet/views"

const { Renderer, EditRenderer, wrapOne, wrapOneAttributes, wrapMany, escapeString } = await import(`${PATH}/js/scribnet/document/renderer/Renderer.mjs`)
const { default: HTMLRenderer } = await import(`${PATH}/js/scribnet/document/renderer/HTMLRenderer.mjs`)
// const { default: EditDocument } = await import(`${PATH}/js/scribnet/document/EditDocument.mjs`)
// const { Segment, ListSegment } = await import(`${PATH}/js/scribnet/document/Segment.mjs`)
const { Doc, Context, Segment, Gap } = await import(`${PATH}/js/scribnet/section/Context.mjs`)

// welp. That was a bigger pain to make than I wanted. This can be way more compact, can join characters
// const serializedSegments = '[{"tags":["H1"],"characters":["T","i","t","l","e","!"," ","w","h","a","t"," ","i","n"," ","t","h","e"," "]},{"tags":["EM","H1"],"characters":["h","e","c","k"]},{"tags":["H1"],"characters":[" ","a","r","e"," ","a","l","l"," ","t","h","e","s","e"," ","d","e","m","o"," ","p","a","g","e","s"," ","f","o","r","?","\\n"]},{"tags":["P"],"characters":["T","h","i","s"," ","d","o","c","u","m","e","n","t"," ","e","x","i","s","t","s"," ","t","o"," ","e","a","s","i","l","y"," ","c","o","n","s","t","r","u","c","t"," ","o","b","j","e","c","t","s"," ","f","o","r"," ","u","n","i","t"," ","t","e","s","t","i","n","g","!","\\n"]},{"tags":["P"],"characters":["F","e","a","t","u","r","i","n","g"," ","a"," ","c","o","u","p","l","e"," ","o","f"," ","c","o","o","l"," ","p","a","r","a","g","r","a","p","h","s",","," "]},{"tags":["STRONG","P"],"characters":["i","n","l","i","n","e"," ","e","l","e","m","e","n","t","s",","]},{"tags":["P"],"characters":[" "]},{"tags":["EM","STRONG","P"],"characters":["n","e","s","t","e","d"]},{"tags":["STRONG","P"],"characters":[" ","l","i","n","e"," ","e","l","e","m","e","n","t","s",","]},{"tags":["P"],"characters":[" ","a","n","d"," ","s","o"," ","m","u","c","h"," ","m","o","r","e","!","\\n"]},{"tags":["P"],"characters":["W","e","l","l",","," ","n","o","t"," ","\\"","s","o"," ","m","u","c","h","\\""," ","m","o","r","e","."," ","J","u","s","t"," ","e","n","o","u","g","h"," ","t","o"," ","t","e","l","l"," ","m","e"," ","i","f"," ","t","h","e","r","e"," ","a","r","e"," ","p","r","o","b","l","e","m","s","!"," ","L","i","k","e"," ","m","a","y","b","e"," ","s","o","m","e"," ","u","t","f","-","1","6"," ","😀"," ","p","r","e","t","t","y"," ","g","l","a","d"," ","v","s","c","o","d","e"," ","s","u","p","p","o","r","t","s"," ","u","n","i","c","o","d","e"," ","c","o","d","e"," ","p","o","i","n","t","s",".",".",".","\\n"]},{"tags":["H2"],"characters":["W","e","\'","v","e"," ","g","o","t"," ","h","e","a","d","e","r","s"," ","t","o","o","\\n"]},{"tags":["P"],"characters":["I"," ","t","h","i","n","k"," ","t","h","i","s"," ","i","s"," ","a","l","r","i","g","h","t"," ","f","o","r"," ","a"," "]},{"tags":["EM","P"],"characters":["s","t","a","n","d","a","r","d"]},{"tags":["P"],"characters":[" ","d","o","c","u","m","e","n","t"," ","e","x","p","e","r","i","e","n","c","e","."," ","D","o","n","\'","t"," ","y","o","u","?","\\n"]}]'
// const segments = JSON.parse(serializedSegments).map(seg => Object.setPrototypeOf(seg, Segment.prototype))
// const docOrigin = EditDocument.fromListSegment(ListSegment.from(...segments))

const testContexts = [
  Context.createContext('h1',Segment.from(...'AAAAA')),
  Context.createContext('p',Segment.from(...'BBBBB')),
  Context.createContext('p',Segment.from(...'CCCCC')),
  Context.createContext('h2',Segment.from(...'DDDDD')),
  Context.createContext('p',Segment.from(...'EEEEE')),
  Context.createContext('p',Segment.from(...'FFFFF')),
]

const testDoc = Doc.from(...testContexts)


describe('Renderer', function () {
  describe('helpers', function () {

    describe('wrapOne', function () {
      it('produces correct html for single tag', function () {
        const result = wrapOne('p', 'I am the contents of a paragraph')
        const expected = "<p>I am the contents of a paragraph</p>"
        assert.strictEqual(result, expected)
      })
    })

    describe('wrapOneAttributes', function () {
      it('produces correct html for single tag with attributes', function () {

        // Not wise to HTML semantics, otherwise we could, e.g, use a list of strings for class
        const attributes = {
          style: 'color: red;',
          class: 'class1 class2 class3'
        }
        const result = wrapOneAttributes('p', attributes, 'contents')
        const expected = `<p style="color: red;" class="class1 class2 class3">contents</p>`
        assert.strictEqual(result, expected)
      })
    })

    describe('wrapMany', function () {
      it('returns the input if no tags are given', function() {
        // base case
        const expected = "I am a string"
        const result = wrapMany([], expected)

        assert.strictEqual(result, expected)

      })
      it('wraps a single piece of content multiple tags', function() {
        const result = wrapMany(['bold', 'em'], "I am a string")

        const expected = "<bold><em>I am a string</em></bold>"

        assert.strictEqual(result, expected)
      })
    })
  })

  describe('escapeString', function () {
    const unescaped = "Silly ' little \"<\" characters > &"
    const actual = escapeString(unescaped)
    const expected = 'Silly &#39; little &quot;&lt;&quot; characters &gt; &amp;'
    it('escapes the characters', function() {
      assert.strictEqual(actual, expected)
    })
  })

  describe('EditRenderer', function () {
    // describe('toHTML', function () {
    //   const editRenderer = new EditRenderer(docOrigin)
    //   docOrigin.select(100)
    //   it('creates the right HTML for collapsed selection', function () {
    //     const expected = "Title! what in the heck are all these demo pages for?\nThis document exists to easily construct objec<span style=\"border-left: 0.1rem solid #b100c4;\">t</span>s for unit testing!\nFeaturing a couple of cool paragraphs, inline elements, nested line elements, and so much more!\nWell, not &quot;so much&quot; more. Just enough to tell me if there are problems! Like maybe some utf-16 😀 pretty glad vscode supports unicode code points...\nWe&#39;ve got headers too\nI think this is alright for a standard document experience. Don&#39;t you?\n"
    //     assert.strictEqual(editRenderer.toHTML(docOrigin), expected)
    //   })
    //   it('creates the right HTML for non-collapsed selection', function () {
    //     docOrigin.select(300, 350)
    //     const expected = "Title! what in the heck are all these demo pages for?\nThis document exists to easily construct objects for unit testing!\nFeaturing a couple of cool paragraphs, inline elements, nested line elements, and so much more!\nWell, not &quot;so much&quot; more. Just enough to tell me if there are problems! Like maybe <mark style=\"background-color: #6667ab\">some utf-16 😀 pretty glad vscode supports unicode </mark>code points...\nWe&#39;ve got headers too\nI think this is alright for a standard document experience. Don&#39;t you?\n"
    //     assert.strictEqual(editRenderer.toHTML(docOrigin), expected)
    //   })
    // })
  })

  describe('HTMLRenderer', function () {

    // stripTags regex: removes each pair of open/close angle brackets and word characters within them
    const stripTags = s => s.replace(/<\/?\w+>/g,'')
    const htmlRenderer = new HTMLRenderer()
    const source = "<h1>Title! what in the <em>heck</em> are all these demo pages for?</h1><p>This document exists to easily construct objects for unit testing!</p><p>Featuring a couple of cool paragraphs, <strong>inline elements,</strong> <strong><em>nested</em> line elements,</strong> and so much more!</p><p>Well, not &quot;so much&quot; more. Just enough to tell me if there are problems! Like maybe some utf-16 😀 pretty glad vscode supports unicode code points...</p><h2>We&#39;ve got headers too</h2><p>I think this is alright for a <em>standard</em> document experience. Don&#39;t you?</p>"
    const testNestedContext = Context.createContext('ul',
      Context.createContext('li', Segment.from('A')),
      Context.createContext('li', Segment.from('B')),
      Context.createContext('li', 
        Segment.from('C'), 
        Context.createContext('ul',
          Context.createContext('li', Segment.from(...'cA')),
          Context.createContext('li', Segment.from(...'cB')),
          Context.createContext('li', Segment.from(...'cC')),
          Context.createContext('li', Segment.from(...'cD'))
        ),
      ),
      Context.createContext('li', Segment.from('D')),
    )
    const testNestedDoc = Doc.from(testNestedContext)

    it('has the right text', function() {
      const rendered = htmlRenderer.toHTML(testDoc)
      assert.strictEqual(stripTags(rendered), testDoc.toString())
    })

    it('creates the right HTML', function() {
      const htmlRenderer = new HTMLRenderer()
      const actual = htmlRenderer.toHTML(testDoc)
      const expected = "<h1>AAAAA</h1><p>BBBBB</p><p>CCCCC</p><h2>DDDDD</h2><p>EEEEE</p><p>FFFFF</p>"

      assert.strictEqual(actual, expected)
    }) 

    describe('renderContext', function () {

      it('Renders with indentation', function () {

        const testContextsIndent = [
          testContexts[0],
          testContexts[1].indent(2),
          ...testContexts.slice(2)
        ]

        const testDoc = Doc.from(...testContextsIndent)

        const actual = htmlRenderer.toHTML(testDoc)
        const expectedMargin = `${2 * htmlRenderer.indentationUnitsPerTab}${htmlRenderer.indentationUnits}`
        const expected = `<h1>AAAAA</h1><p style="margin-left: ${expectedMargin};">BBBBB</p><p>CCCCC</p><h2>DDDDD</h2><p>EEEEE</p><p>FFFFF</p>`

        assert.strictEqual(actual, expected)

      })

    })

    describe('Render Nested', function () {
      const idk ='<ul><li></li><li><ul><li><ul><li></li></ul></li><li></li></ul></li><li></li></ul>'


      it('renders correct html', function () {
        // const expected = '<ul><li>A</li><li>B</li><ul><li>C<li>cA</li><li>cB</li><li>cC</li><li>cD</li></li></ul><li>D</li></ul>'
        const actual = htmlRenderer.toHTML(testNestedDoc)
        const expected = '<ul><li><p>A</p></li><li><p>B</p></li><li><p>C</p><ul><li><p>cA</p></li><li><p>cB</p></li><li><p>cC</p></li><li><p>cD</p></li></ul></li><li><p>D</p></li></ul>'
        assert.strictEqual(actual, expected)
      })
    })
    
    describe('pathToCursorInDOM', function () {
      
      function test(func, { input, expected }) {
        assert.deepStrictEqual(func(...input), expected, `Expect input of [ ${input.join(", ")} ] to yield ${expected}`)
      }
      function testAll(func, testCases) {
        // for (const { input, expected } of testCases ) {
        for (const testCase of testCases )
          test(func, testCase)
      }
      
      it('finds correct "DOM path" & offset with inline tags', function () {

        const boldNested = testNestedDoc.toggleTags(['strong'], 10, 13)

        // +1 maps because togglingTags here will add additional boundaries, and we want the boundaries that 'squeeze' the toggle section
        const lb = 10 + 1, rb = 13 + 1

        const testCases = [
          { input: [ boldNested, lb ], expected: [ [0, 2, 1, 1, 0, 1, 0 ], 0] }, // ul li ul li p strong #text
          { input: [ boldNested, rb ], expected: [ [0, 2, 1, 2, 0, 0, 0 ], 1] }, // ul li ul li p strong #text
        ]

        testAll(HTMLRenderer.pathToCursorInDOM, testCases)

      })

    })
  })
})