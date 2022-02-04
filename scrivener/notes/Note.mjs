
class Note {
  // currently, html content, as its stored. But a "Note" doesn't have that notion generally
  // (TODO decouple content & presentation)
  constructor(name, content) {
    this.name = name
    this.content = content
  }
}

export default Note
