'use strict'
import fs from 'fs/promises'
import path from 'path'

class Loader {


  constructor() {
    this.notes = new Map()  // string to string, name to contents. maybe type.
    // this.load()
  }

  async load(noteName) {
    this.notes.set(noteName, "")
  }

  async get(noteName) {
    if (!this.notes.has(noteName)) await this.load(noteName)
    return this.notes.get(noteName)
  }
  async has(noteName) {
    return false
  }
}

class FileLoader extends Loader {

  constructor(directory) {
    this.directory = directory
  }

  get contents() {
    // might need a flag to check when it was updated last, e.g a 'touch'
    // would invalidate the "cache"
    // if (this.dirContents === undefined) await this._refresh()
    // return this.dirContents
    return Promise.resolve()
      .then(_ => this.dirContents === undefined ? this._refresh() : Promise.resolve())
      .then(_ => this.dirContents)
  }

  async _refresh() {
    this.dirContents = await fs.readdir(this.directory)
  }
  _invalidate() { // lazy cache invalidation
    this.dirContents = undefined
  }

  async _exists(noteName) {
    const boundReturn = _ => this.contents
    return Promise.resolve()
      // .then(_ => this.contents)  // not entirely sure 'this' would be bound correctly
      .then(boundReturn)
      .then(dirContents => dirContents.includes(noteName))
      .catch(_ => false)
    
  }

  async load(noteName) {
    // PreCondition: note exists, this.directory exists
    const noteContents = fs.readFile(path.join(this.directory, noteName))
    this.notes.set(noteName, noteContents)
  }

  async has(noteName) {

    return this._exists(noteName)
  }
}

/**
 * Design thoughts
 * Does a loader abstraction fit at the moment?
 * For now only supporting loading/saving to the file system
 * Eventually I'd like to expand to databases, unstructured data storage, etc.
 * A "Notes" though has the ability to load and write. If it loads from one
 * place and writes to another, that doesn't seem to make sense, so it wouldn't
 * use a separate 'loader' from 'saver', but maybe it would. I think, to get
 * a vertical cut, we'll keep the logic I've written in FileLoader for fs 
 * management and make a call on that later.
 * Maybe put that down to the level of a single 'Note'. Locations might vary,
 * e.g we want to arbitrarily edit any note but notes are saved in both a
 * "public" folder and a "prviate" one. Public is publicly accessible and can
 * be edited live. Private is not, and notes accessed from there must SAVE to
 * there too. I'll wait before trying that, really eager to get something out 
 * today as a basic app to work off.
 */

class Notes {

  constructor() {

  }
  static load(fileLoader) {
    const notes = new Notes()
    notes.fileLoader = fileLoader
  }

  fetch(notename) {
    return this.fileLoader.get(notename)
  }

}

export { FileLoader }

export default Notes
