
class ObjectModel {

  constructor() {

  }

  get isLeaf() {
    return undefined;
  }

}

class Node {
  constructor() {
    this.nodes = []
  }

  get children() {
    return this.nodes;
  }
}

class InternalNode {

  constructor() {
    this.nodes = []
  }

}

class leafNode {
  constructor() {
    this.content = ""
  }

  get isLeaf() {
    return true;
  }
}