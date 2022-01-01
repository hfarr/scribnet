
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