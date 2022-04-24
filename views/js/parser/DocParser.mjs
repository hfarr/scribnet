import { Parser } from "./Parser.mjs";

import Doc from "../scribnet/section/Doc.mjs";
import Context from "../scribnet/section/Context.mjs";
import Segment from "../scribnet/section/Segment.mjs";

const TAG = 'Tag'
const RANGLE = 'RAngle'
const LANGLE = 'LAngle'
const RPAREN = 'RParen'
const LPAREN = 'LParen'
const SEG_TEXT = 'SegText'
const COMMA = 'Comma'
const EOI = 'EOI'
const COMMENT = 'Comment'

function unescapeSegText(segText) {
  // two escape sequences, \\ for a \ and \' for a '
  // Notwithstanding JS escapes which would have been handled by now.
  // When we get a string input to here we treat the escapes as Scribdoc escapes, not as JS escapes,
  // but we must use js escapes because the escape character is the same. Confused? me too, so I'll try to simplify it.
  const ESCAPE_ESCAPE = '\\\\'  // the escape sequence \\ in scribdoc
  const ESCAPE_SINGLE_QUOTE = '\\\''  // the escape sequence \' in scribdoc

  const textPieces = segText.split(ESCAPE_ESCAPE) // we'll handle these last, but they are priority, in a sense. If we have \\' then it will interpret it as an escaped \ at the end of the segment. but if it enocunters \\\' then that is the unescaped \'  yeah this is a bit confusing.
  const mappedPieces = textPieces.map(text => text.replaceAll(ESCAPE_SINGLE_QUOTE, `'`))

  const result = mappedPieces.join('\\')

  return result

}

class DocParser extends Parser {

  // Pretty sure the comment token must come at the end FYI
  static tokenREs = [ 
    /'(?<SegText>(\\\\|(?<=(?:\\\\)*)\\'|[^'\\])*)'/, // Explanation:  we exclude single backslashes and single quotes from the segtext group. Then we make an exception for specific escape sequences. Very CSS like. exceptional.
    /(?<Tag>\w+)/, /(?<LAngle><)/, /(?<RAngle>>)/, 
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
      this.consume(RANGLE, "Expect '>' at end of Doc tag")
    }
    if (!this.isAtEnd()) {
      this.error(this.peek(), "Expect end of input")
    }
    return Doc.from(...contexts)
  }

  context() {

    const tok = this.consume(TAG, 'Expect tag at start of context')

    this.consume(LANGLE, 'Expect "<"')

    const sections = []
    while (!this.check(RANGLE) && !this.isAtEnd()) {
      if (this.check(TAG)) {
        sections.push(this.context())
      } else if (this.check(SEG_TEXT) || this.check(LPAREN)) {
        sections.push(this.segment())
      } else {

        this.error(this.peek(), "Expect Context or Segment")
      }
      
    }

    this.consume(RANGLE, 'Expect ">"')
    return Context.createContext(tok.lexeme, ...sections)
  }

  segTags() {
    this.consume(LPAREN, 'Expect "("')

    const tags = []

    while (!this.check(RPAREN) && !this.isAtEnd()) {

      tags.push(this.consume(TAG, 'Expect tag in segment tags').lexeme)

      if (!this.check(RPAREN)) {
        this.consume(COMMA, "Expect ',' between Segment Tags")
      }
    }
    this.consume(RPAREN, 'Expect ")"')
    return tags
  }

  segment() {

    let tags = []
    if (this.check(LPAREN))
      tags = this.segTags()

    const segText = this.consume(SEG_TEXT)
    const unescapedText = unescapeSegText(segText.lexeme)

    // need to expand the language to enable inline tags
    return Segment.createSegment(tags, unescapedText)
  }
}

export default DocParser