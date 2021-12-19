

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




  computeDocumentRange(htmlRange) {
    let docRange = document.createRange()

    let summation = -1;
    let index = 0;
    summation = 0;

    docRange.selectNode(this.editor.children[index])
    while ( docRange.comparePoint(htmlRange.startContainer, 0) === 1 ) {  // while the start of the range is after docRange
      console.debug(`${index}: {${docRange.toString()}}`, docRange)
      summation += docRange.endOffset;  // start offset is 0 so endOffset represents the text length that's selected.
      docRange.selectNode(this.editor.children[++index])
    }
    let startOffset = summation + htmlRange.startOffset;
    console.log("Start offset", startOffset)
    while ( docRange.comparePoint(htmlRange.endContainer, 0) === 1 ) {  // while the end of the range is after docRange
      console.debug(`{${docRange.toString()}}`)
      summation += docRange.endOffset;  // start offset is 0 so endOffset represents the text length that's selected.
      docRange.selectNode(this.editor.children[++index])
    }
    console.log("End offset", summation + htmlRange.endOffset)

    docRange.detach()
    return [startOffset, (summation + htmlRange.endOffset) - startOffset]

  }

  receive(event) {
    const { type, data } = event;

    // if (type === "selectionchange")
    // dispatch(type)(data)
  }

  // only call if the range is contained within the document
  // selectionChanged()



}