import { Parser } from "./Parser.mjs";

import Doc from "../scribnet/section/Doc.mjs";
import Context from "../scribnet/section/Context.mjs";
import Segment from "../scribnet/section/Segment.mjs";

const TAG = 'Tag'
const RANGLE = 'RAngle'
const LANGLE = 'LAngle'
const SEG_TEXT = 'SegText'
const EOI = 'EOI'
const COMMENT = 'Comment'

class DocParser extends Parser {

  // Pretty sure the comment token must come at the end FYI
  static tokenREs = [ 
    /(?<Tag>\w+)/, /(?<LAngle><)/, /(?<RAngle>>)/, /'(?<SegText>.*?)'/, 
    /(?<Comma>,)/, /(?<LParen>\()/, /(?<RParen>\))/,
    /\s+/, /(?<Comment>#.*)(\n|$)/ 
  ] 

  otherInit() {
    this.tokens = this.tokens.filter(tok => tok.type !== COMMENT)
  }

  parse() {

    return this.doc() 

  }

  doc() {
    
    const firstTok = this.peek()
    let hasOptionalTag = false
    if (firstTok?.type === TAG && firstTok?.lexeme === 'Doc') {
      this.advance()
      this.consume(LANGLE, "Expect '<' after 'Doc'")
      hasOptionalTag = true
    }
    
    const contexts = []
    
    while (!this.isAtEnd() && !this.check(RANGLE)) {
      contexts.push(this.context())
    }
    if (hasOptionalTag) {
      this.consume('RAngle', "Expect '>' at end of Doc tag")
    }
    if (!this.isAtEnd()) {
      this.error(this.peek(), "Expect end of input")
    }
    return Doc.from(...contexts)
  }

  context() {

    const tok = this.consume('Tag', 'Expect tag at start of context')

    this.consume('LAngle', 'Expect "<"')

    const sections = []
    while (!this.check('RAngle') && !this.isAtEnd()) {
      if (this.check('Tag')) {
        sections.push(this.context())
      } else if (this.check('SegText') || this.check('LParen')) {
        sections.push(this.segment())
      } else {

        this.error(this.peek(), "Expect Context or Segment")
      }
      
    }

    this.consume('RAngle', 'Expect "<"')
    return Context.createContext(tok.lexeme, ...sections)
  }

  segTags() {
    this.consume('LParen', 'Expect "("')

    const tags = []

    while (!this.check('RParen') && !this.isAtEnd()) {

      tags.push(this.consume('Tag', 'Expect tag in segment tags').lexeme)

      if (!this.check('RParen')) {
        this.consume('Comma', "Expect ',' between Segment Tags")
      }
    }
    this.consume('RParen', 'Expect ")"')
    return tags
  }

  segment() {

    let tags = []
    if (this.check('LParen'))
      tags = this.segTags()

    const segText = this.consume('SegText')
    // need to expand the language to enable inline tags
    return Segment.createSegment(tags, segText.lexeme)
  }
}

export default DocParser