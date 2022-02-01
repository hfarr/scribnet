

class Document {
  constructor() {
    this.name = "New Document"
    this.content = ""
  }

  static rawDoc(name, content) {
    const doc = new Document()
    doc.name = name
    doc.content = content
    return doc
  }
}

// Document:  constructor function
// Document.prototype: an


// Q: could we replace "Document.prototype" rather than try to update its attribution?


const aspect = Symbol('Some Aspect')

const attachOnConstruct = obj => obj[aspect] = { someAttribute: "words words words" }

function register(constructorFunction) {

}

// Circumstance where 'this' is used in "function() {...}" syntax. "this" refers to the
// object on the left of the dot operator when the function is applied. In the case of
// classes, that would be instances, which look up the function in their prototype when
// it's called.
Document.prototype.getLength = function() { return this.length }

const myDoc = new Document();

// Some facts
// Object.getPrototypeOf(myDoc) === Document.prototype
// - Internal slot [[Prototype]] of "myDoc" set to "Document.prototype" by the new keyword
// - Document.prototype is the shared state/behavior of all Document instances

// Document.prototype is different than Object.getPrototypeOf(Document), that is the prototype of the constructor function itself.
// I find it a bit confusing to reason through at first. The '.prototype' is a property that points to the object which is set as
// the prototype for all instantiations of a constructor function when using 'new'.

// console.log('Document constructor function',Document)
// console.log('[[Prototype]] internal slot for Document', Object.getPrototypeOf(Document)) // an empty object. This class, this constructor function, never had its internal slot set by a 'new' keyword. Every function declaration though does have an empty object in its [[Prototype]] internal slot, unlike normal objects, whose prototypes are Object.prototype (the null prototype)
// console.log('.prototype property of Document. Set to "internal slot" for instances constructed with "new" operator', Document.prototype) // [[Prototype]] internal slot. Functions in javascript have a '.prototype' property which references this object.
console.log(Document)
console.log(Object.getPrototypeOf(Document)) // an empty object. This class, this constructor function, never had its internal slot set by a 'new' keyword. Every function declaration though does have an empty object in its [[Prototype]] internal slot, unlike normal objects, whose prototypes are Object.prototype (the null prototype)
console.log(Object.getPrototypeOf(Document) === Function.prototype)
console.log(Document.prototype)

// "Constructors" are instances of Function. This means the [[Prototype]] internal slot of a constructor function, or class, is Function.prototype
// We have the following as true:
//    Object.getPrototypeOf(Document) === Function.prototype 
// This statement is true for any class made with the class syntax.
// Moreover, in javascript there is no difference between functions and constructors- any function can be called with new (!)
// 
// console.log('Constructor prototype internal slot', Object.getOwnPropertyDescriptors(Object.getPrototypeOf(Document))) 

// Document.prototype.constructor = function() { this.name = "placeholder name" }


// Object.prototype is the "root" prototype for all (or just most) objects. It's the "default" for the prototype chain.
// Some library objects like Map have a prototype that sets all of the properties. Look ups on the prototype chain
// of instances don't reach the Object.prototype as a result.

// what piece is "called"? "Document" right? it's the "apply"?

// Document.prototype = {
//   constructor: Document,
// }
// nawr
// Document.prototype.constructor = Document;
// Document.prototype.constructor = function() {
  // this.name= "no"
// };

Document.apply = 
Document.bind = 
Document.call = 

console.log("done")

// yeah but even then.
Object.setPrototypeOf(Document, {
  apply: function() {},
  bind: function() {},
  call: function() {},
})

// Document: an instance of Function
// calling "new" on an instance of function invokes /what/ ?

//----
// for my purposes, we may not need to "overwrite" the constructor at all. though. I might still do that as an experiment
// if I can figure it out. I believe it is sufficient to set the attribute on the constructor, or... on the [class].prototype,
// which is then automatically applied on each instance. As a lookup on the instance would yield that. rather, we can modify
// the class, inject functionality.
// Setting a Symbol like we do can be thought of as a hidden prototype chain. Or a hidden internal slot [[<our symbol>]].
// We can hijack the constructor functionality to yield a similar system and get the cross-cutting behaviors without 
// interfering in normal class operations.
// another idea: encode the prototype chain! That is each class that's registered store the [class].prototype. Thing is this
// approach wouldn't solve the bigger issue of knowing which constructor to use, as an application of "new" or otherwise.
// on the brightside it gives me a way to get around calling new at all. No need to levy restrictions on the use of 
// constructors with more than 0 arguments.
// for now I think I still have to do registration, it is promising that I can avoid hijacking the constructor if need be.
// but! I still want to. I want to demonstrate the "aspect oriented" approach here if I can even call it that. Will be useful
// for my listener patterns, I can port the technology over to the front end. Abstract out a library.
// 
// Many possibilities. Let's iterate on some.