
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
function process(node, children, childrenNodes) {

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
    return string.replace(/^[^\P{White_Space}\u{00A0}]/u, '')
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
 * @param base Base element. In practice there a no "empty trees", rather, 
 *             a single base element attached to the "right" most leaf. This supports using treeFoldr
 *             as if the tree were a list. That is to say inputting an "empty tree" won't return the
 *             base value, instead the results are not well defined. For now this is intended but
 *             subject to revision in the future.
 * @param tree Tree on which to operate.
 * @returns 
 */
function treeFoldr(f, base, tree) {

  // if (tree.childNodes.length === 0) {
  // it probably *should* return base -- this impacts like. All of the clients are impacted.
  // Nevertheless. It's tricky, this was developed for 'node' specifically, and the leafs of
  // DOM nodes are textNodes generally. It's not always clear what to do for a child case.
  // That is a bit of an excuse.
  // TODO upddate this to return base, as one would generally expect, or put thought into
  // why it should apply 'tree' to base instead.
  // User responsbility to work out what the 'base' case is, as otherwise it should just be
  // empty lists most of the time, for treeFoldr.
  // Whats hard is if the node has no children usually you want it processed the same way,
  // or rather, unlike lists where the base case is the empty list, we don't support a concept
  // of an "Empty tree" as this was defined with Nodes in mind. But we can rework it to support
  // a 'leaf' notion as something without a value, then it can handle e.g text nodes fine.
  // Another thought, in a tree, there can be many bases, but in a list there is only one base,
  // which disrupts our notion of how to handle that. It seems to make the most sense to use
  // a function to combine the current value with whatever the "base" is, which allows us
  // to preserve the notion of a "single base" and maintain the idea that this is effectively
  // a reduceRight on an array. Except the array is specified by a DOM tree.
  // return base
  // return f(tree, base)
  // }

  const listapply = (treeList) => {
    return treeList.reduceRight((res, item) => treeFoldr(f, res, item), base)
  }

  return f(tree, listapply([...tree.childNodes]))
}


function _clonc(predicate, f, base) {

  return function (n, prev) {
    if (predicate(n)) {
      return f(n, base)
    }
    return f(n, prev)
  }
}

function pruneDown(root, target) {
  // console.log(treeFoldr(_clonc( x => x === target, treeTraverseClone(), []), [], root)[0])
  // console.log(treeFoldr(clonc( x => x === target, treeTraverseClone(), []), [], root)[0])

  return treeFoldr(_clonc(x => x === target, treeTraverseClone(), []), [], root)[0]
  // return treeFoldr(clonc( x => x === target, treeTraverseClone(), []), [], root)[0]
}

function treeTraverseClone() {  //default just clones the tree. okay can't think right now how to approach creating a structure-preserving tree map with a fold-right. I Think it should be do-able
  const parentMap = new WeakMap()

  function _treeID(node, previous) {
    // b/c of visit order, the children of the node make up the prefix to the list.
    // so we don't have to do anything else to preserve the structure other than filter for them
    // we have the following invariant: if i < j then nodes[i] appears before nodes[j] in the document

    const clone = node.cloneNode()
    parentMap.set(clone, node.parentElement)
    // const numChildren = previous.filter( p => p.parentElem === node).length
    // previous.slice(0, numChildren)
    // .forEach(n => clone.appendChild(n) )

    // a partition sort of function
    const [kids, siblings] = previous.reduce(([c, s], n) => (parentMap.get(n) === node ? [[...c, n], s] : [c, [...s, n]]), [[], []]) // has functional programming gone TOO FARR? some would say: not nearly enough!

    kids.forEach(n => clone.appendChild(n))

    return [clone, ...siblings]
  }
  return _treeID
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

// Public

export function renderedText(rootElement, selectedNode) {
  let pruned = pruneDown(rootElement, selectedNode)
  // let finalChildren
  // function procWrap(node, children, nodes) {
  //   // Light wrapper to extract the final result of the children before they're
  //   // concatenated in the result.
  //   let result = process(node, children, nodes)
  //   finalChildren = children;

  //   return result
  // }

  // const res = treeTraverse(procWrap, pruned)
  // return res.slice(0, -selectedNode.textContent.length)
  return treeTraverse(process, pruned)
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


