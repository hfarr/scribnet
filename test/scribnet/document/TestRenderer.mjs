'use strict'
import assert from 'assert';
const PATH = "/home/henry/dev/scribnet/views"

const { Renderer, EditRenderer, HTMLRenderer, escapeString } = await import(`${PATH}/js/scribnet/document/Renderer.mjs`)
const { default: EditDocument } = await import(`${PATH}/js/scribnet/document/EditDocument.mjs`)
const { Segment, ListSegment } = await import(`${PATH}/js/scribnet/document/Segment.mjs`)

// welp. That was a bigger pain to make than I wanted. This can be way more compact, can join characters
const serializedSegments = '[{"tags":["H1"],"characters":["T","i","t","l","e","!"," ","w","h","a","t"," ","i","n"," ","t","h","e"," "]},{"tags":["EM","H1"],"characters":["h","e","c","k"]},{"tags":["H1"],"characters":[" ","a","r","e"," ","a","l","l"," ","t","h","e","s","e"," ","d","e","m","o"," ","p","a","g","e","s"," ","f","o","r","?","\\n"]},{"tags":["P"],"characters":["T","h","i","s"," ","d","o","c","u","m","e","n","t"," ","e","x","i","s","t","s"," ","t","o"," ","e","a","s","i","l","y"," ","c","o","n","s","t","r","u","c","t"," ","o","b","j","e","c","t","s"," ","f","o","r"," ","u","n","i","t"," ","t","e","s","t","i","n","g","!","\\n"]},{"tags":["P"],"characters":["F","e","a","t","u","r","i","n","g"," ","a"," ","c","o","u","p","l","e"," ","o","f"," ","c","o","o","l"," ","p","a","r","a","g","r","a","p","h","s",","," "]},{"tags":["STRONG","P"],"characters":["i","n","l","i","n","e"," ","e","l","e","m","e","n","t","s",","]},{"tags":["P"],"characters":[" "]},{"tags":["EM","STRONG","P"],"characters":["n","e","s","t","e","d"]},{"tags":["STRONG","P"],"characters":[" ","l","i","n","e"," ","e","l","e","m","e","n","t","s",","]},{"tags":["P"],"characters":[" ","a","n","d"," ","s","o"," ","m","u","c","h"," ","m","o","r","e","!","\\n"]},{"tags":["P"],"characters":["W","e","l","l",","," ","n","o","t"," ","\\"","s","o"," ","m","u","c","h","\\""," ","m","o","r","e","."," ","J","u","s","t"," ","e","n","o","u","g","h"," ","t","o"," ","t","e","l","l"," ","m","e"," ","i","f"," ","t","h","e","r","e"," ","a","r","e"," ","p","r","o","b","l","e","m","s","!"," ","L","i","k","e"," ","m","a","y","b","e"," ","s","o","m","e"," ","u","t","f","-","1","6"," ","😀"," ","p","r","e","t","t","y"," ","g","l","a","d"," ","v","s","c","o","d","e"," ","s","u","p","p","o","r","t","s"," ","u","n","i","c","o","d","e"," ","c","o","d","e"," ","p","o","i","n","t","s",".",".",".","\\n"]},{"tags":["H2"],"characters":["W","e","\'","v","e"," ","g","o","t"," ","h","e","a","d","e","r","s"," ","t","o","o","\\n"]},{"tags":["P"],"characters":["I"," ","t","h","i","n","k"," ","t","h","i","s"," ","i","s"," ","a","l","r","i","g","h","t"," ","f","o","r"," ","a"," "]},{"tags":["EM","P"],"characters":["s","t","a","n","d","a","r","d"]},{"tags":["P"],"characters":[" ","d","o","c","u","m","e","n","t"," ","e","x","p","e","r","i","e","n","c","e","."," ","D","o","n","\'","t"," ","y","o","u","?","\\n"]}]'
const segments = JSON.parse(serializedSegments).map(seg => Object.setPrototypeOf(seg, Segment.prototype))
const docOrigin = EditDocument.fromListSegment(ListSegment.from(...segments))


describe('Renderer', function () {
  describe('escapeString', function () {
    const unescaped = "Silly ' little \"<\" characters > &"
    const actual = escapeString(unescaped)
    const expected = 'Silly &#39; little &quot;&lt;&quot; characters &gt; &amp;'
    it('escapes the characters', function() {
      assert.strictEqual(actual, expected)
    })
  })

  describe('EditRenderer', function () {
    describe('toHTML', function () {
      const editRenderer = new EditRenderer(docOrigin)
      docOrigin.select(100)
      it('creates the right HTML for collapsed selection', function () {
        const expected = "Title! what in the heck are all these demo pages for?\nThis document exists to easily construct objec<span style=\"border-left: 0.1rem solid #b100c4;\">t</span>s for unit testing!\nFeaturing a couple of cool paragraphs, inline elements, nested line elements, and so much more!\nWell, not &quot;so much&quot; more. Just enough to tell me if there are problems! Like maybe some utf-16 😀 pretty glad vscode supports unicode code points...\nWe&#39;ve got headers too\nI think this is alright for a standard document experience. Don&#39;t you?\n"
        assert.strictEqual(editRenderer.toHTML(docOrigin), expected)
      })
      it('creates the right HTML for non-collapsed selection', function () {
        docOrigin.select(300, 350)
        const expected = "Title! what in the heck are all these demo pages for?\nThis document exists to easily construct objects for unit testing!\nFeaturing a couple of cool paragraphs, inline elements, nested line elements, and so much more!\nWell, not &quot;so much&quot; more. Just enough to tell me if there are problems! Like maybe <mark style=\"background-color: #6667ab\">some utf-16 😀 pretty glad vscode supports unicode </mark>code points...\nWe&#39;ve got headers too\nI think this is alright for a standard document experience. Don&#39;t you?\n"
        assert.strictEqual(editRenderer.toHTML(docOrigin), expected)
      })
    })
  })

  describe('HTMLRenderer', function () {
    // const tagStrip = /<\/?\w+>/g
    const stripTags = s => s.replace(/<\/?\w+>/g,'')
    const htmlRenderer = new HTMLRenderer(docOrigin)
    const source = "<h1>Title! what in the <em>heck</em> are all these demo pages for?</h1><p>This document exists to easily construct objects for unit testing!</p><p>Featuring a couple of cool paragraphs, <strong>inline elements,</strong> <strong><em>nested</em> line elements,</strong> and so much more!</p><p>Well, not &quot;so much&quot; more. Just enough to tell me if there are problems! Like maybe some utf-16 😀 pretty glad vscode supports unicode code points...</p><h2>We&#39;ve got headers too</h2><p>I think this is alright for a <em>standard</em> document experience. Don&#39;t you?</p>"
    it('has the right text', function() {
      const rendered = htmlRenderer.toHTML(docOrigin)
      assert.strictEqual(stripTags(rendered), stripTags(source))
    })

    it('creates the right HTML', function() {
      const htmlRenderer = new HTMLRenderer(docOrigin)
      const expected = "<h1>Title! what in the <em>heck</em> are all these demo pages for?</h1><p>This document exists to easily construct objects for unit testing!</p><p>Featuring a couple of cool paragraphs, <strong>inline elements,</strong> <strong><em>nested</em> line elements,</strong> and so much more!</p><p>Well, not &quot;so much&quot; more. Just enough to tell me if there are problems! Like maybe some utf-16 😀 pretty glad vscode supports unicode code points...</p><h2>We&#39;ve got headers too</h2><p>I think this is alright for a <em>standard</em> document experience. Don&#39;t you?</p>"
      // Okay. This test. Thing is, multiple 'outputs' are correct. For example these are valid:
      // Produced by renderer: <strong><em>boldphasis</em></strong><strong> bold</strong>   
      // Example source:       <strong><em>boldphasis</em> bold</strong>   
      // because we cgroup inline segments by the *sets* of tags they have. It's equivalent. So, the question then is, what's correct?
      // assert.strictEqual(htmlRenderer.toHTML(), expected)
    }) 
    
    it('renders across block elements correctly', function() {  
      // er. Emm. hmm.
      // const crossBoundaryBold = [{"tags": ["H1"],"characters": ["T","i","t","l","e","!"," ","w","h","a","t"," ","i","n"," ","t","h","e"," "]},{"tags": ["EM","H1"],"characters": ["h","e","c","k"]},{"tags": ["H1"],"characters": [" ","a","r","e"," ","a","l","l"," ","t","h","e","s","e"," ","d","e","m","o"," ","p","a","g","e","s"," ","f","o","r","?","\n"]},{"tags": ["P"],"characters": ["T","h","i","s"," ","d","o","c","u","m","e","n","t"," ","e","x","i","s","t","s"," ","t","o"," ","e","a","s","i","l","y"," ","c","o","n","s","t","r","u","c","t"," ","o","b","j","e","c","t","s"," ","f","o","r"," ","u","n","i","t"," ","t","e","s","t","i"]},{"tags": ["P","strong"],"characters": ["n","g","!","\n"]},{"tags": ["P","strong"],"characters": ["F","e"]},{"tags": ["P"],"characters": ["a","t","u","r","i","n","g"," ","a"," ","c","o","u","p","l","e"," ","o","f"," ","c","o","o","l"," ","p","a","r","a","g","r","a","p","h","s",","," "]},{"tags": ["STRONG","P"],"characters": ["i","n","l","i","n","e"," ","e","l","e","m","e","n","t","s",","]},{"tags": ["P"],"characters": [" "]},{"tags": ["EM","STRONG","P"],"characters": ["n","e","s","t","e","d"]},{"tags": ["STRONG","P"],"characters": [" ","l","i","n","e"," ","e","l","e","m","e","n","t","s",","]},{"tags": ["P"],"characters": [" ","a","n","d"," ","s","o"," ","m","u","c","h"," ","m","o","r","e","!","\n"]},{"tags": ["P"],"characters": ["W","e","l","l",","," ","n","o","t"," ","\"","s","o"," ","m","u","c","h","\""," ","m","o","r","e","."," ","J","u","s","t"," ","e","n","o","u","g","h"," ","t","o"," ","t","e","l","l"," ","m","e"," ","i","f"," ","t","h","e","r","e"," ","a","r","e"," ","p","r","o","b","l","e","m","s","!"," ","L","i","k","e"," ","m","a","y","b","e"," ","s","o","m","e"," ","u","t","f","-","1","6"," ","😀"," ","p","r","e","t","t","y"," ","g","l","a","d"," ","v","s","c","o","d","e"," ","s","u","p","p","o","r","t","s"," ","u","n","i","c","o","d","e"," ","c","o","d","e"," ","p","o","i","n","t","s",".",".",".","\n"]},{"tags": ["H2"],"characters": ["W","e","'","v","e"," ","g","o","t"," ","h","e","a","d","e","r","s"," ","t","o","o","\n"]},{"tags": ["P"],"characters": ["I"," ","t","h","i","n","k"," ","t","h","i","s"," ","i","s"," ","a","l","r","i","g","h","t"," ","f","o","r"," ","a"," "]},{"tags": ["EM","P"],"characters": ["s","t","a","n","d","a","r","d"]},{"tags": ["P"],"characters": [" ","d","o","c","u","m","e","n","t"," ","e","x","p","e","r","i","e","n","c","e","."," ","D","o","n","'","t"," ","y","o","u","?","\n"]}]
      // const CBBSeg = ListSegment.from(...crossBoundaryBold.map(seg=>Object.setPrototypeOf(seg,Segment.prototype)))
      const expected = '<h1>Title! what in the <em>heck</em> are all these demo pages for?</h1><p>This document exists to easily construct objects for unit testi<strong>ng!</strong></p><p><strong>Fe</strong>aturing a couple of cool paragraphs, <strong>inline elements,</strong> <em><strong>nested</strong></em><strong> line elements,</strong> and so much more!</p><p>Well, not &quot;so much&quot; more. Just enough to tell me if there are problems! Like maybe some utf-16 😀 pretty glad vscode supports unicode code points...</p><h2>We&#39;ve got headers too</h2><p>I think this is alright for a <em>standard</em> document experience. Don&#39;t you?</p>'
      docOrigin.select(117, 123)
      assert.strictEqual(docOrigin.selection(), "ng!\nFe")
      const rendered = htmlRenderer.toHTML(docOrigin.applyTag('strong'))
      assert.strictEqual(rendered, expected)
    })

    it('renders this one edged case too', function() {
      const expected = '<h1>Title! what in the <em>heck</em> are all these demo pages for?</h1><p>This document exists to easily construct objects for unit testi<strong>ng!</strong></p><p><strong>Fe</strong>aturing a couple of cool paragraphs, <strong>inline elements,</strong> <em><strong>nested</strong></em><strong> line elements,</strong> and so much more!</p><p>Well, not &quot;so much&quot; more. Just enough to tell me if there are problems! Like maybe some utf-16 😀 pretty glad vscode supports unicode code points...</p><h2>We&#39;ve got headers to</h2><p> think this is alright for a <em>standard</em> document experience. Don&#39;t you?</p>'
      const original = docOrigin.copy()
      original.select(385, 388)
      const deleted = original.delete()
      assert.strictEqual(htmlRenderer.toHTML(deleted), expected)

    })
  })
})