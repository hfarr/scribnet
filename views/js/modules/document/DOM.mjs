
/**
 * Test a string to see if it is entirely "collapsible" whitespace.
 * Collapsible whitespace is whitespace that, when adjacent to other
 * collapsible whitespace, reduces to one piece of whitespace at 
 * render time.
 * 
 * @param string String to test
 * @returns True if the string consists of 'breaking' spaces
 */
function allCollapsibleWhiteSpace(string) {

  // string consists of all whitespace that aren't &nbsp;
  // this doesn't work for new lines
  return /^[^\P{White_Space}\u{00A0}]*$/u.test(string)
}


/**
 * Trim leading collapsible white space
 * @param string String to trim
 * @returns 
 */
function trimLeading(string) {
  return string.replace(/^[^\P{White_Space}\u{00A0}]+/u, '')
}
function trimTrailing(string) {
  return string.replace(/[^\P{White_Space}\u{00A0}]+$/u, '')
}

function trimBreaking(string) {
  return trimLeading(trimTrailing(string))
}

function collapseBreaking(string) {
  return string.replaceAll(/[^\P{White_Space}\u{00A0}]+/gu, ' ')
}
/**
 * Determine if the node is empty (no visible content)
 * 
 * @param node A DOM node
 */
function empty(node) {

  if (node?.tagName === 'P') {
    // console.debug(node.innerText === '', `<|${node.innerText}|>`, `<|${node.innerHTML}|>` )
    return node.innerText === ''
  }
  return false
}


const blockNodes = /^(p(re)?|h[1-6])$/i
const blockSet = new Set(
  ["p", "h1", "h2", "h3", "div", "pre", "editor-hf"]
)

/**
 * Recursive function to walk a node and compute the "user rendered"
 * string. The key objective is to compute the text that would be rendered
 * for nodes that have not necessarily been attached to the DOM, or a subset
 * of a tree that is attached to the DOM. 
 * innerText accomplishes the same goal but only for complete subtrees of the
 * DOM. If for example you only want a subset of nodes, such as those 
 * representing text selected by the user, you cannot easily deduce the indices
 * of innerText that would represent the selction, or where the user cursor 
 * lands.
 * @param node Current node
 * @param children String 
 * @param childrenNodes Original child nodes
 * @returns 
 */
function processText(node, children, childrenNodes) {

  // TODO develop abstractions to manage the details of particular nodes, etc.

  if (node.nodeType === Node.COMMENT_NODE) {
    return ""
  }
  if (!node.hasChildNodes()) {
    // The result is "" for childless elements, text for text nodes
    return node.textContent
  }

  const oneOrMoreWhitespace = /[^\P{White_Space}\u{00A0}]+/u

  function zip(l1, l2, f = (a, b) => [a, b]) {
    const res = []
    for (let i = 0; i < l1.length && i < l2.length; i++) {
      res.push(f(l1[i], l2[i]))
    }
    return res
  }
  // here is where we have room to improve. We want to focus on converting
  // from browser representation to internal document. Right now this
  // relies on expectations about browser behavior or even the kinds of HTML
  // we'll munch on. Might be better served parsing the raw for internal use
  // so it's independent. That and we don't always need to compute selection
  // lengths, it's relevant for user operations when something is selected
  // yes but for many cases its not. We could for example re-build the document
  // internally on a cut or paste rather than try to mirror actions. 
  // Im rambling, I would like to stick to using the browser as a controller
  // and not the source of truth.
  function betwixt([[c1Text, c1Node], [c2Text, c2Node]]) {
    if (allWhiteSpace(c1Text)) {
      return "";
    }

    if (blockNodes.test(c1Node?.tagName)) {
      // innerText shows block elements with two spaces. Probably should test the space "between" block elements,
      // which I think would entail testing c2 and not c1. Or, maybe it doesn't matter since it gets cut?
      // ehhhh I need to break this up into an abstraction to finesse the details with ease (ironic, I suppose)
      // In this case the counting is equivalent, but notionally I'm not operating in a "between" sense even
      // (rather an "after" sense) though that's the context this function, ostensibly, operates under
      return "\n\n";
    }
    if (oneOrMoreWhitespace.test(c1Text.slice(-1)) || oneOrMoreWhitespace.test(c2Text.slice(0, 1))) {
      return " "
    }
    return ""
  }
  function allWhiteSpace(string) {

    // string consists of all whitespace that aren't &nbsp;
    // this doesn't work for new lines
    return /^[^\P{White_Space}\u{00A0}]*$/u.test(string)
  }

  function collapseInternalBreaking(string) {
    return string.replaceAll(/[^\P{White_Space}\u{00A0}]+/gu, ' ')
  }
  function trimLeading(string) {
    return string.replace(/^[^\P{White_Space}\u{00A0}]+/u, '')
  }
  function trimTrailing(string) {
    return string.replace(/[^\P{White_Space}\u{00A0}]+$/u, '')
  }

  // The zip is "eager", it will fill in undefineds for remaining resources
  let adjacent = zip(children, childrenNodes)

  let paddingBetween = zip([["", undefined], ...adjacent], adjacent).map(betwixt)

  let collapsed = children.map(collapseInternalBreaking)
    .map((s, i) => i > 0 ? trimLeading(s) : s)
    .map((s, i) => i < children.length - 1 ? trimTrailing(s) : s)

  let contextRender = zip(paddingBetween, collapsed, (s1, s2) => `${s1}${s2}`)

  let textRender = contextRender.join('')

  return textRender;

}

/**
 * Perform a right-associative reduction of a DOM node.
 * Notionally this is equivalent to using reduceRight on a pre-order traversal of the tree.
 * 
 * @param f Function to combine the accumulated values with the current value. Arguments are ordered current, accumulated
 * @param base Base element. Although its natural to assume the base would apply to leaves of the tree
 *             treeFoldr effectively operates like reduceRight on a pre-order traversal of the tree.
 *             There is only one base, which combines only with the last node in a pre-order traversal
 *             much like how the last element in a list would combine.
 * @param tree Tree on which to operate.
 * @returns The accumulated result of folding f over a pre-order traversal of tree (right associative)
 */
function treeFoldr(f, base, tree) {

  const listapply = (treeList) => {
    return treeList.reduceRight((res, item) => treeFoldr(f, res, item), base)
  }

  return f(tree, listapply([...tree.childNodes]))
}

/**
 * treeTraverse folds over the tree by applying functions that do an
 * in order traversal. It is built on using treeFoldr, but the difference
 * is the input function operates on the tree and its children that have
 * been recursively operated on.
 * treeFoldr only considers the tree and the record of processing the 
 * children recursively at that point in time. Semantically it's more like
 * traversing over a list.
 * Another way to imagine the difference is treeTraverse maps the recursion
 * onto its children, before applying the function to the parent and the
 * result of the map. A nice bonus is context from processing the right-er
 * elements of the tree is passed to the left-er parts of the tree because
 * its build on treeFoldr. In fact it is this bonus feature that enables
 * this to work at all.
 * 
 * @param f function whose parameters are the current node, the processed 
 *          results of that nodes children, and the original children nodes
 */
function treeTraverse(f, tree) {
  // TODO should work on trees generally, and write an extension for Node
  // and any concrete tree representations (e.g an object) that implements
  // a "treeTraverse" interface. Which, for us, probably just means providing
  // functions that treeTraversecan call to access the Node, the Children,
  // etc. without making assumptions, which it does for node traversal.

  function unzip(pairs) {
    return pairs.reduce(([accFst, accSnd], [fst, snd]) => [[...accFst, fst], [...accSnd, snd]], [[], []])
  }

  function _combine(node, prev) {

    let numChildren = prev.reduce((acc, [n, _]) => acc + (n.parentElement === node ? 1 : 0), 0)
    let [childNodes, children] = unzip(prev.slice(0, numChildren))

    return [[node, f(node, children, childNodes)], ...prev.slice(numChildren)]

  }

  return unzip(treeFoldr(_combine, [], tree))[1][0]

}

/**
 * Recursively traverse a tree, applying the wrapped function
 * only if the predicate holds. Filters out nodes for which
 * it doesn't. Effectively, since the traversal is pre-order,
 * this is analogous to "takeWhile" where only the *prefix*
 * of nodes in the tree accepted by the predicate will be
 * available in the final computation.
 * 
 * @param predicate Function that filters nodes
 * @param f Function to apply if the predicate holds
 * @returns The value of the function if the predicate holds, undefined otherwise
 */
function traversePrune(predicate, f) {

  return (node, children, childrenNodes) => {

    if (predicate(node)) {
      children = children.filter(Boolean)

      return f(node, children, childrenNodes)
    }
    return undefined
  }
}

export { treeTraverse, treeFoldr }

// Public

export function renderedText(rootElement, node) {

  const upToAndIncludingNode = nodeOther => {
    if (nodeOther === node) return true;
    return node.compareDocumentPosition(nodeOther) & (Node.DOCUMENT_POSITION_PRECEDING | Node.DOCUMENT_POSITION_CONTAINS)
  }

  const renderedText = traversePrune(upToAndIncludingNode, processText)

  return treeTraverse(renderedText, rootElement)
}

/**
 * Normalizes HTML
 * Takes actions against the document that cut out 'unrendered' information
 * A pretty print of a kind 
 * Yeah, it would be appropriate to use a visitor esque approach, and this could be the recursive engine
 * 
 * @param documentRoot root node of the document to fix
 */
export function formatDocument(documentRoot) {

  let cull = (node, children) => {
    let maybeNode = undefined

    if (!empty(node)) {
      maybeNode = node.cloneNode()
      children.filter(Boolean)
        .forEach((childNode) => {
          maybeNode.appendChild(childNode);
        })

      if (maybeNode?.tagName === 'P') {
        // Sole node is a text node

        if (maybeNode.childNodes.length === 1) {
          let textNode = maybeNode.firstChild
          textNode.innerText = maybeNode.innerText
        }

        maybeNode.innerHTML = trimBreaking(maybeNode.innerHTML)

        // This eliminates text space that is pure "guff", without needing to parse it with some excruciating regex
        // maybeNode.innerText = maybeNode.innerText
        // Okay learned my lesson. The browser is ALL too happy to add in <br>s
        // At least fire fox is. Meh!
      }

      if (maybeNode?.nodeType === Node.TEXT_NODE) {
        maybeNode.textContent = collapseBreaking(maybeNode.textContent)
      }
    }

    return maybeNode
  }

  let res = document.createElement('div')

    // Rather than send documentRoot through, or 'res' after copying children
    // we map over the children and perform post processing on the first children.
    // There are some difficulties with using the documentRoot as the base element
    // such as cloning it causes it's constructor to run- which calls
    // formatDocument. But we want access to un-copied nodes, direct from the DOM,
    // so that we have access to 'rendered' attributes, namely innerText.
    // If we copy children into res first and then use that as the root innerText
    // is empty because it hasn't been flowed over the document, and we aren't
    // keen to do that either.
    ;[...documentRoot.childNodes].filter(x => x?.nodeType === Node.ELEMENT_NODE)
      .map(cn => treeTraverse(cull, cn))
      .filter(Boolean)
      .forEach(child => res.appendChild(child))

  return res

}


