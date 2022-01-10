'use strict'
import assert from 'assert';
const PATH = "/home/henry/dev/scribnet/views"

const { Renderer, EditRenderer, HTMLRenderer } = await import(`${PATH}/js/scribnet/document/Renderer.mjs`)
const { default: EditDocument } = await import(`${PATH}/js/scribnet/document/EditDocument.mjs`)
const { Segment, ListSegment } = await import(`${PATH}/js/scribnet/document/Segment.mjs`)

// welp. That was a bigger pain to make than I wanted. This can be way more compact, can join characters
const serializedSegments = '[{"tags":["H1"],"characters":["T","i","t","l","e","!"," ","w","h","a","t"," ","i","n"," ","t","h","e"," "]},{"tags":["EM","H1"],"characters":["h","e","c","k"]},{"tags":["H1"],"characters":[" ","a","r","e"," ","a","l","l"," ","t","h","e","s","e"," ","d","e","m","o"," ","p","a","g","e","s"," ","f","o","r","?","\\n"]},{"tags":["P"],"characters":["T","h","i","s"," ","d","o","c","u","m","e","n","t"," ","e","x","i","s","t","s"," ","t","o"," ","e","a","s","i","l","y"," ","c","o","n","s","t","r","u","c","t"," ","o","b","j","e","c","t","s"," ","f","o","r"," ","u","n","i","t"," ","t","e","s","t","i","n","g","!","\\n"]},{"tags":["P"],"characters":["F","e","a","t","u","r","i","n","g"," ","a"," ","c","o","u","p","l","e"," ","o","f"," ","c","o","o","l"," ","p","a","r","a","g","r","a","p","h","s",","," "]},{"tags":["STRONG","P"],"characters":["i","n","l","i","n","e"," ","e","l","e","m","e","n","t","s",","]},{"tags":["P"],"characters":[" "]},{"tags":["EM","STRONG","P"],"characters":["n","e","s","t","e","d"]},{"tags":["STRONG","P"],"characters":[" ","l","i","n","e"," ","e","l","e","m","e","n","t","s",","]},{"tags":["P"],"characters":[" ","a","n","d"," ","s","o"," ","m","u","c","h"," ","m","o","r","e","!","\\n"]},{"tags":["P"],"characters":["W","e","l","l",","," ","n","o","t"," ","\\"","s","o"," ","m","u","c","h","\\""," ","m","o","r","e","."," ","J","u","s","t"," ","e","n","o","u","g","h"," ","t","o"," ","t","e","l","l"," ","m","e"," ","i","f"," ","t","h","e","r","e"," ","a","r","e"," ","p","r","o","b","l","e","m","s","!"," ","L","i","k","e"," ","m","a","y","b","e"," ","s","o","m","e"," ","u","t","f","-","1","6"," ","😀"," ","p","r","e","t","t","y"," ","g","l","a","d"," ","v","s","c","o","d","e"," ","s","u","p","p","o","r","t","s"," ","u","n","i","c","o","d","e"," ","c","o","d","e"," ","p","o","i","n","t","s",".",".",".","\\n"]},{"tags":["H2"],"characters":["W","e","\'","v","e"," ","g","o","t"," ","h","e","a","d","e","r","s"," ","t","o","o","\\n"]},{"tags":["P"],"characters":["I"," ","t","h","i","n","k"," ","t","h","i","s"," ","i","s"," ","a","l","r","i","g","h","t"," ","f","o","r"," ","a"," "]},{"tags":["EM","P"],"characters":["s","t","a","n","d","a","r","d"]},{"tags":["P"],"characters":[" ","d","o","c","u","m","e","n","t"," ","e","x","p","e","r","i","e","n","c","e","."," ","D","o","n","\'","t"," ","y","o","u","?","\\n"]}]'
const segments = JSON.parse(serializedSegments).map(seg=>Object.setPrototypeOf(seg, Segment.prototype))
const docOrigin = EditDocument.fromListSegment(ListSegment.from(...segments))


describe('Renderer', function() {
  describe('escapskies', function() {

  })
})

describe('EditRenderer', function() {
  describe('toHTML', function() {
    const editRenderer = new EditRenderer(docOrigin)
    docOrigin.select(100)
    it('creates the right HTML', function() {
      // assert.strictEqual(actual, expected)
      assert.strictEqual(editRenderer.toHTML(), 
"Title! what in the heck are all these demo pages for?\n\
This document exists to easily construct objec<span style=\"border-left: 0.1rem solid #b100c4;\">t</span>s for unit testing!\n\
Featuring a couple of cool paragraphs, inline elements, nested line elements, and so much more!\n\
Well, not &quot;so much&quot; more. Just enough to tell me if there are problems! Like maybe some utf-16 😀 pretty glad vscode supports unicode code points...\n\
We&#39;ve got headers too\n\
I think this is alright for a standard document experience. Don&#39;t you?\n")
    })
  }) 
})

describe('HTMLRenderer', function() {

})