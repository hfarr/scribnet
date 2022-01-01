
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


  function unzip(pairs) {
    return pairs.reduce(([accFst, accSnd], [fst, snd]) => [[...accFst, fst], [...accSnd, snd]], [[], []])
  }

  function _combine(node, prev) {

    let numChildren = prev.reduce((acc, [n, _]) => acc + (n.parentElement === node ? 1 : 0), 0)
    let [childNodes, children] = unzip(prev.slice(0, numChildren))

    return [[node, f(node, children, childNodes)], ...prev.slice(numChildren)]

  }

  return unzip(_treeFoldr(_combine, [], tree))[1][0]

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

