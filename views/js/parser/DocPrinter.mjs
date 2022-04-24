

function escapeSegText(segText) {
  const ESCAPE = '\\'
  const SINGLE_QUOTE = '\''

  const textPieces = segText.split(ESCAPE)
  const mappedPieces = textPieces.map(text => text.replaceAll(SINGLE_QUOTE, `\\'`))
  const result = mappedPieces.join('\\\\')

  return result
}

class DocPrinter {
  constructor(topSection) {
    this.tabDepth = -1
    this.tabWidth = 2
    this.topSection = topSection
  }

  print() {
    return this.printSection(this.topSection)
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
      childStrings.push(this.printSection(subSec, depth + 1))
    }

    return [
      lead,
      childStrings.join(''),
      follow
    ].join('')

  }
  printMixedContext(section, depth) {

    const tag = section.block

    const lead = `${this.padding}${tag} <\n`
    const follow = `${this.padding}>\n`

    const childStrings = []
    for (const subSec of section.subPieces) {
      childStrings.push(this.printSection(subSec, depth + 1))
    }


    return [
      lead,
      childStrings.join(''),
      follow
    ].join('')
  }
  printContext(section, depth) {

    const tag = section.block

    const lead = `${this.padding}${tag} < `
    const follow = '>\n'

    const childStrings = []
    for (const subSec of section.subPieces) {
      childStrings.push(this.printSegment(subSec))
    }


    return [
      lead,
      childStrings.join(' '),
      follow
    ].join('')
  }
  printSegment(section, depth) {

    const tagList = section.tags.join(', ')
    const segText = `'${escapeSegText(section.toString())}'`

    if (tagList === '') return segText

    return `(${tagList})${segText}`
  }
}

export default DocPrinter