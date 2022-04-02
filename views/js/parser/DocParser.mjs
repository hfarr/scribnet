import { Parser } from "./Parser.mjs";

import Doc from "../scribnet/section/Doc.mjs";
import Context from "../scribnet/section/Context.mjs";
import Segment from "../scribnet/section/Segment.mjs";

const docTokens = [ /(?<Context>\w+)/, /(?<LAngle><)/, /(?<RAngle>>)/, /'(?<SegText>.*?)'/, /\s*/ ]

class DocParser extends Parser {

  static tokenREs = [ /(?<Tag>\w+)/, /(?<LAngle><)/, /(?<RAngle>>)/, /'(?<SegText>.*?)'/, /\s*/ ] 

  parse() {

    return this.doc() 

  }

  doc() {
    
    const contexts = []
    
    while (!this.isAtEnd()) {
      contexts.push(this.context())
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
      } else if (this.check('SegText')) {
        sections.push(this.segment())
      } else {

        this.error(this.peek(), "Expect Context or Segment")
      }
      
    }

    this.consume('RAngle', 'Expect "<"')
    return Context.createContext(tok.lexeme, ...sections)
  }

  segment() {

    const segText = this.consume('SegText')
    // need to expand the language to enable inline tags
    return Segment.createSegment([], segText.lexeme)
  }
}

// -----

const sample = "h1 < 'A List' > ul < li<p<'A'>> li<p<'B'>ul< li<p<'aB'>> li<p<'bB'>> >> li<p<'C'>>> "

const docParser = new DocParser(sample)
const doc = docParser.parse()

console.debug('testing')
console.debug(doc.toString())

export default DocParser