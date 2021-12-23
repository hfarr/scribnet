

class Controller {
  
  constructor(editor) {
    this.editor = editor;

    // console.debug("Created controller")
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
     */

    if (tree.childNodes.length === 0) {
      return f(tree, base)
    } 

    // conveniently offload the work of reducing right to the array fn. 
    // should the base of a node be the result of the node to its right, in a in-order traversal?
    // signs point to yes, but I'm not sure its applicable, since this is a post-order fold. or, 
    // maybe it is relevant.
    // const kiddos = [...tree.childNodes]
    //   .map(t => this.treeFoldr(f,base,t))
    //   .reduce(f, base)

    // children   : [ a, b, c, d, e, f ]
    // folded     : f(a, f(b, f(c, f(d, f(e, base )))))
    // that is there result we want. but we need to express it as an infix operator to work with foldr
    // , => <$>   : a <$> b <$> c <$> d <$> e <$> (x => f(x, base))
    // a <$> f can be read as "apply f to a", it takes a prefix expression translates it to an infix-one,
    // and in this case the order of the arguments are swapped. in Haskell f <$> a is the applicative 
    // translating roughly to f(a). we take the "argument" as the left operand so the form here is a
    // version of <$> with args swapped.
    // To understand how to implement <$>, we need to know the types of it's arguments and its return
    // result. We know the type of the first argument (same type as the list elements), and we know
    // the type of the second argument should match the type of the first argument. The "initial" is used
    // for the second argument all the way over to the right, so we need a type for intial that expresses
    // applying f to a value and the base element. Take a look at the right most end (base case)
    // How would we express f(e, base) as an infix operator? Point replacement          <--- not the right term
    // e <$> ??? must observe <$>(e, ?) = ?(e) = f(e,base)
    //                    -> ?: (x) => f(x, base)
    // This becomes the 'initial' value and we can use it as a clue for what <$> should look like
    // in the general case:
    // <$>: (left, right) => (x => right(x, left))
    //
    // if we were really fancy, we could use "point elimination" ((again not sure of term)) to remove
    // the use of x at all

    const apply = (arg, func) => x => f(x, func(arg))
    const listapply = (treeList) => {
      return treeList.reduceRight( (res, item) => treeFoldr(f, res, item), base )
    }

    return f(tree, listapply([...tree.childNodes]))
    // the "base" is f applied to the immediate left value, and base
    // the application is still applying 'f' each step, but it uses the 
    // folded right half as the base. One view on this is it offloads the
    // actual application of 'f' to its left arg. Each 'func' can be
    // replace like so: func(arg) = f(arg, <right>). Since 'right' is not
    // available at this step in the tree, we wrap it in a closure which
    // 'holds' the value all the way up the chain, until it all collapses.

  }

  _getTextLength(startNode, node, nodeOffset) {
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
    // console.debug("Brother may I have some lengths")
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