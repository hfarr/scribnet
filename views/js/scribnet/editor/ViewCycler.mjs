const data = Symbol("data")

const surrogate = obj => obj[data]
const createSurrogate = o => o[data] = {}
// could restrict the fields. Could use surrogacy as a way to force private access or 
// restrict ability to write.
// const createSurrogate = (o, fields) => {
  // const props = fields.map(f => {
  //   return { [f]: {
  //     get: function() { return o['f'] },
  //     set: function(v) { o['f'] }
  //   }}}
  // )
  // const surrogate = {}
  // Object.defineProperties(surrogate, props)
  // o[data] = surrogate
  // o[data] = {}
// }

export default class ViewCycler extends HTMLElement {

  // Trying a thing
  // static data = Symbol("pointer")
  // static fields = [ "pointer" ]
  
  constructor() {

    // createSurrogate(this, ViewCycler.fields)
    this[data] = { ["pointer"]: 0 }

  }

  set selected() {
    this.setAttribute('selected')
  }

  get selected() {
    this.getAttribute('selected')
  }

  get observedAttributes() {
    return ['selected'].map(s => s.toLocaleLowerCase())
  }

  attributeChangedCallback() {
    
  }

  select() {
    if (this.childElementCount > 0) {

    }
  }

  // before each method call, automatically in-scope "surr"?
  // using a bit of Metaprogramming? hmm
  cycleForward() {
    // const surr = surrogate(this)
    const surr = this[data]
    if (this.childElementCount > 0) {
      surr.pointer = (surr.pointer + 1) % this.childElementCount
    }
    this.select()
  }

  cycleBackward() {
    const surr = this[data]
    if (this.childElementCount > 0) {
      surr.pointer = (this.pointer === 0) ? this.childElementCount - 1 : this.pointer - 1 % this.childElementCount
    }
    this.select()
  }

}