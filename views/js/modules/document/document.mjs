

// atoms and ranges. an atom could be a string or element

// segment represents content with tags.
// Imprint as a mimicking struct on the whole?
class Segment {

  constructor(tag, start, end) {
    this.tag = tag
    this.start = start
    this.end = end
  }

  /*
    return the part of the range that overlaps
    Segment.EMPTY
   */
  intersection(other) {
    

  }

  intersects(other) {

    // easier to check for *not* intersecting, so negation of that
    // If disjoint, one of the ends comes before the other's start
    // I guess actually. A start comes before an end? both starts 
    // come before both ends? that identically checks for intersection?
    // test time...
    let disjoint = ( this.end < other.start || other.end < this.start )
    return !disjoint

  }

  isEmpty() {
    return this.start === this.end
  }

  /* 
    ge and le because tags come "between" 
    pieces of content, the indexed position doesn't 
    obstruct. Segments defined by the boundaries
    boundaries: | | | | | | | | | | |
    indices:     _ _ _ _ _ _ _ _ _ _
                 0 1 2 3 4 5 6 7 8 9
    
    length is terminal of last segment
    segments can start/end at the same boundaris (principal of non interference)
    or share a boundary at one point, disagree at another.
    an alt rep could "union" at a boundary any shared tags
    
    we are basically creating a stack but tailoring it for fast indexing. the other
    way to determine which segments we're in... well. Maybe this problem doesn't
    have quite the stack semantics Im thinking of. There's a feeling there to it.
  */

  contains(idx) {
    return this.start < idx && idx < this.end
  }

}

class EmptySegment extends Segment {
  static singleton = new EmptySegment()

  intersection(other) {
    return [this]
  }

  isEmpty() {
    return true
  }

  contains(idx) {
    return false
  }
}


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

/**
 * I'd like better than linear lookups on containing segments. What struct? a tree
 * Maybe a cursed array list
 * *another* structure could identify the 'ranges' that all share the same segments,
 * which close over the totla as a disjoint set
 * ---1--4--2-242-3---3---2---1
 * would be 
 * 0-3:
 * 3-5:   1
 * 5-7:   1,4
 * 7-8:   1,4,2
 * 8-9:   1,2
 * 9-12:  1,2,3
 * 12-15: 1,2
 * 15-18: 1
 * SEE! a stack!
 * could we constant time idx into the keys? hard when it's a range,
 * could also track at each idx the members it belongs to
 * 
 * come to think of it we have to project down to this layer when rendering. Each of these represents a different group of tag.
 * convert a list of segments to a tree. 
 * 
 * Manipulating a tree is difficult when you have to re-arrange the branches, but as a list that manipulation is easier, so
 * two reps.
 */

/** 
 * Stack style?
 * 
 * no. Begin/end tags can be thought of nesting ranges
 * Also as a tree, but the ranges helps because we will
 * approach this by detecting when we are in the middle
 * of a set of ranges, to split them into three parts,
 * before, between, and after the new styling tags
 * 
 * Document before edit
 * ---1----2--3---3---2---1
 * 
 * Selected range
 * ---1--*--2-*-3---3---2---1
 *  range is contained in 1..1, no need to split
 *  range splits 2..|..2!
 * 
 * amend existing ranges
 * ---1--*--2-2*2-3---3---2---1
 * 
 * insert new tags
 * ---1--4--2-242-3---3---2---1
 * 
 * 
 * Data structure - "elements" which are broadly 'strings'
 * and formatters
 * Formatters could (should?) exist in a parallel struct?
 * benefit is we separate content from execution?
 * no, treat it all the same, hmm.
 */

function appendAt(block) {
  return function({ character, offset }) {
    let idx = 0, sum = 0;
    do  { // work out le or ge
      sum += block.atoms[0].content.length;
    } while (sum <= offset);
    // idx is the index of the atom we're modifying

    // offset into the atom
    offset -= sum;
    return `${atom.content.slice(0, offset)}${character}${atom.content.slice(offset)}`;

  }
}

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

class Document {

  // Should we parse? parse html? like uh. 
  // 
  constructor() {
    this.blocks = []
    this.cursor = { block: 0, offset: 0 };
    this.actions = {
      'typeSingleChar': appendAt,
    }
  }

  setActiveBlock(idx) {
    if (0 <= idx && idx < this.blocks.length) {
      this.cursor.block = idx
    }

    console.log("Active Block", idx, this.activeBlock)
  }

  get activeBlock() {
    if (this.blocks.length === 0) {
      this.blocks.push(new Block('p'))
    }
    console.log("Get active block", this.cursor, this.blocks)
    return this.blocks[this.cursor.block];
  }

  fromDOM(children) {

    for (blockElem in children) {

      let block = new Block(blockElem.tagName);

    }
  }

  appendAt (offset, character) {
    this.activeBlock.appendAt(offset, character)

  }

  // A promise, to render
  editCommand(command) {
    let { action, data } = command

    // may have to do some validation on the command, 
    // but maybe it can occur when the command is created. it's an interface to
    // anything that can edit.

    // actions[action](data)
    switch(action) {
      case ('typeSingleChar'): this.appendAt(data.offset, data.character);
    }


    // end-edit notifier. Maybe make this async. Can methods be async? I guess so right? or I can have it call an async and return ..?

  }

  accept(visitor) {
    return visitor.visitDocument(this)
  }

}

// Inline rendering pieces. Note they may still 'break'.
// but they don't for the sake of document flow count as breaking elements.
// there a way I can do that? "breaking inline" element? like paragraph.
// idea is it takes up max width w/in a line. Like an embedded object.
class Atom {

  // atomic piece of content. Typically text. Could also be an image for example.
  // Right now it's just text, as I evolve the document model to
  // support more fun stuff this too will evolve.
  constructor(styles, content) {
    this.styles = styles
    this.content = content
  }

  // appendAt visitor? :<
  appendAt(offset, character) {
    this.content = `${this.content.slice(0, offset)}${character}${this.content.slice(offset)}`;

  }

  accept(visitor) {
    return visitor.visitAtom(this);
  }
}


class Block {
  constructor (tagname, ...atoms) {
    this.tag = tagname
    this.atoms = atoms

    if ( this.atoms.length === 0 ) {
      this.atoms.push(new Atom([], ''))
    }
  }

  appendAt(offset, character) {
    let idx = 0, accumulatedLength = 0;

    let atomLength = index => this.atoms[index].content.length;


    // 0       1     2        3   4
    // -------|-----|---*----|---|--------
    //        7     5        8   3
    // Append at 15
    /**
     * idx  sum
     * 0    0   (0 + 7  > 15 false)
     * 1    7   (7 + 5  > 15 false)
     * 2    12  (12 + 8 > 15 true)
     * offset into index: 
     * 15 - 12: 3
     */

    // while the next index is reachable and the offset is after the accumulated sum and the next, 
    while (idx + 1 < this.atoms.length && !(accumulatedLength + atomLength(idx + 1) > offset) ) {
      idx += 1
      accumulatedLength += atomLength(idx)
    }
    // accumulatedLength <= offset < accumulatedLength + next.length

    // offset into the atom
    offset -= accumulatedLength;
    
    // not super efficient, we are doing a full render so even if we picked a data model that
    // favorite more writes (say, a linked list, inserting at an index)
    // over doing string concatenation, we'd still be concatenating to render :shrug:

    this.atoms[idx].appendAt(offset, character)

  }
    
  accept(visitor) {
    return visitor.visitBlock(this)
  }
}


// visitor interface
class HTMLRenderer {

  static styleToTag = {
    'bold': 'strong',
    'italic': 'em',
  }

  render(item) {
    return item.accept(this)
  }

  getTag(styleString) {
    return HTMLRenderer.styleToTag[styleString]
  }

  visitDocument(doc) {
    let renderedBlocks = doc.blocks.map(b => this.render(b))
    return renderedBlocks.join('')
  }
  
  visitBlock(block) {
    let tag = block.tag
    let final = [`<${tag}>`]
    
    console.log('rendering', block)
    final.push(...block.atoms.map(a => this.render(a)))
    final.push(`</${tag}>`)

    return final.join('')
    
  }

  visitAtom(atom) {
    let openingTags = atom.styles.map((style) => `<${this.getTag(style)}>`)
    let closingTags = atom.styles.map((style) => `</${this.getTag(style)}>`)

    // May need to 'render' content at some point
    return [...openingTags, atom.content, ...closingTags].join('')
  }

}


export { Block, HTMLRenderer, Atom, appendAt }

export { Segment, Document }