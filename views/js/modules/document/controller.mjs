

class Controller {
  
  constructor(editor) {
    this.editor = editor;

    console.debug("Created controller")
  }




  receive(event) {
    console.debug("Controller received event:", event)
  }
}

export class HTMLController extends Controller {

  constructor(editor) {
    super(editor);

    
  }

  renderHTML() {

  }

  export() {

    return this.renderHTML()
  }


  validNode(node) {

    if (node.innerHTML) {
      return node.innerHTML.trim() !== ""
    } else {
      return node.textContent !== ""
    }

  }

  patchText(textNode) {

    // Oops! it breaks because the parent element usually has a lot more text.
    // we still need to recover inner html though
    const d = document.createElement('div')
    d.appendChild(textNode.cloneNode())
    // if textNode.parentElement.childNodes.indexOf(textNode)

    return d.innerHTML.trim().split(/\s+/).join(' ')

    // not me seriously parsing html with regex :S
    // hf.innerHTML.trim().split(/\s*<[^>]+>\s*/)
  }


  mapfn() {

  }


  // could I guess create Functor type classing
  treeFoldr(f, base, tree) {

    // right-to-left post order traversal
    // isLeaf, isInternal
    /**
     * Haskell about to jump out
     * Folding over a tree
     * 
     * folder :: (a -> b -> b) b (Tree a)
     * foldr f base (Leaf contents)                 = f contents, base
     * foldr f base (Internal contents left right)  = f contents (foldr f (foldr f base right) left)
     * 
     * with arbitray children,
     * foldr f base (Leaf contents)             = f contents, base
     * foldr f base (Internal contents [x:xs])  = f contents (foldr f (map (\y -> foldr f base y) xs) x)
     * 
     */


  }



  /**
   * Gets the character (or "atomic") offset of a point from the start of the 
   * document given by a node and offset into the node.
   * 
   * more generally, text offset selected in a range even.
   * but we work out which text is ignorable
   * 
   * @param node 
   * @param offset 
   */
  getTextLength(startNode, node, nodeOffset) {

    if (startNode === node) {
      // Goal case
      return nodeOffset;
    }

    if (startNode.nodeType === Node.TEXT_NODE) {
      // let huh = this.patchText(startNode)
      // console.debug("child", huh);
      return this.patchText(startNode).length;
    }

    let docRange = document.createRange();
    // console.log(startNode)
    docRange.selectNodeContents(startNode);
    const comparison = docRange.comparePoint(node, nodeOffset) 
    docRange.detach()

    switch(comparison) {
      case -1:
        return 0;
      case 0:
      case 1: {
        // let length = 0
        // for (const cn of startNode.childNodes) {
        //   length += this.getTextLength(cn, node, nodeOffset);
        // }
        // // console.debug("length:",length)
        // return length

        // Computes sum of lengths of text nodes
        return [...startNode.childNodes]
          .filter(n => n !== 0)
          .map(cn => this.getTextLength(cn, node, nodeOffset))
          .reduce((p,c) => p + c, 0)
      }
    }


  }


  computeDocumentRange(htmlRange) {
    console.debug("Brother may I have some lengths")
    const startOffset = this.getTextLength(this.editor, htmlRange.startContainer, htmlRange.startOffset)
    const endOffset = this.getTextLength(this.editor, htmlRange.endContainer, htmlRange.endOffset)

    return [startOffset, endOffset - startOffset]

  }

  receive(event) {
    const { type, data } = event;

    // if (type === "selectionchange")
    // dispatch(type)(data)
  }

  // only call if the range is contained within the document
  // selectionChanged()



}