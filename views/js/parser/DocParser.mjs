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

  static tokenREs = [ /(?<Tag>\w+)/, /(?<LAngle><)/, /(?<RAngle>>)/, /'(?<SegText>.*?)'/, /\s+/, /(?<Comment>#.*)(\n|$)/ ] 

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

class DocPrinter {
  constructor(topSection) {
    this.tabDepth = -1
    this.tabWidth = 2
    this.topSection = topSection
  }

  print() {
    return this.printSection(this.topSection).join('')
  }
  get padding() {
    return Array(this.tabWidth * this.tabDepth).fill(" ").join('')
  }
  printSection(section, depth=0) {
    this.tabDepth = depth

    switch(section.constructor.name) {
      case 'Doc':
        return this.printDoc(section, depth)
      case 'ListContext':
      case 'ListItemContext':
      case 'MixedContext':
        return this.printMixedContext(section, depth)
      case 'Context':
        return this.printContext(section, depth)
      case 'Segment':
        return this.printSegment(section, depth)
    }
  }

  printDoc(section, depth) {

    const lead = `${this.padding}Doc <\n`
    const follow = `${this.padding}>\n`
    const childStrings = []
    for (const subSec of section.subPieces) {
      childStrings.push(...this.printSection(subSec, depth + 1))
    }

    return [
      lead,
      ...childStrings,
      follow
    ]

  }
  printMixedContext(section, depth) {

    const tag = section.block

    const lead = `${this.padding}${tag} <\n`
    const follow = `${this.padding}>\n`

    const childStrings = []
    for (const subSec of section.subPieces) {
      childStrings.push(...this.printSection(subSec, depth + 1))
    }


    return [
      lead,
      ...childStrings,
      follow
    ]
  }
  printContext(section, depth) {

    const tag = section.block

    const lead = `${this.padding}${tag} < `
    const follow = '>\n'

    const childStrings = []
    for (const subSec of section.subPieces) {
      childStrings.push(...this.printSection(subSec, depth))
    }


    return [
      lead,
      ...childStrings,
      follow
    ]
  }
  printSegment(section, depth) {

    return [ 
      `'${section.toString()}' `
    ]
  }
}

// -----

const sample = "h1 < 'A List' > ul < li<p<'A'>> li<p<'B'>ul< li<p<'aB'>> li<p<'bB'>> >> li<p<'C'>>> "

const docParser = new DocParser(sample)
const doc = docParser.parse()
const docPrinter = new DocPrinter(doc)

// console.debug('testing')
// console.debug(doc.toString())
// console.debug(docPrinter.print())


export { DocParser, DocPrinter }

export default DocParser