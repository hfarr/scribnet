

// atoms and ranges. an atom could be a string or element


/**
 * rendering might be more updating just a portion
 * Most edit operations will be to apply a styling
 * to some segment of text, type characters. Less
 * likely is to cover broad ranges. We can probably
 * make the common case quick or during a render only
 * udpate affected segments
 * 
 * segment contains both or neither, unaffected
 * segment contains one or other, affected
 */


// generic n dim grid
class OffsetList {

  constructor() {
    this.length = 0
    this.sublists = []
    this.cursor = 0
    this.offset = 0
  }

  get list() {
    return this.offsetLists(this.cursor)
  }

  setIndex (index) {

    this.cursor = 0
    this.offset = index
    while (this.offset - this.subLists[this.cursor] > 0) {
      this.offset -= this.list.length
      this.cursor++
    }
  }
}

class DNode {
  constructor(htmlNode) {
    this.children = []
    this.htmlNode = htmlNode 
  }

  get length() {
    return undefined;
  }
}

class TextNode extends DNode {
  constructor(htmlNode) {
    super(htmlNode);
    this.content = "";
  }

  get length() {
    return this.content.length;
  }
}

class ElementNode extends DNode {
  constructor(htmlNode) {
    super(htmlNode);
  }

  get length() {
    return 1;
  }
}

function parseHTML(htmlNode) {

  let dnode = null;
  if (! htmlNode.hasChildNodes) {
    if (htmlNode.nodeType === Node.TEXT_NODE) {
      dnode = new TextNode()
      dnode.content = htmlNode.textContent
    }
  } else {
    dnode = new ElementNode()
    dnode.htmlNode = htmlNode
  }

  dnode.children = htmlNode.childNodes.map(parseHTML)
  return dnode
}

class Selection {
  constructor() {

  }

  static caratSelection(caratNode, caratOffset) {
    return this.rangeSelection(caratNode, caratOffset, caratNode, caratOffset);
  }
  static rangeSelection(anchorNode, anchorOffset, focusNode, focusOffset) {
    const res = new Selection()
    res.anchorNode = anchorNode
    res.anchorOffset = anchorOffset
    res.focusNode = focusNode
    res.focusOffset = focusOffset
  }
}

class HTMLParser {

  static parse(HTMLElement ) {

  }
}

export class Document {

  // Should we parse? parse html? like uh. 
  // 
  constructor() {
    this.root = null;
    this.selection = [-1,-1];

  }

  accept(visitor, ...args) {
    return visitor.visitDocument(this, ...args)
  }

}

