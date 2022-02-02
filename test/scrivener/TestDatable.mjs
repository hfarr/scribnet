'use strict';

import assert from 'assert';
import fs from 'fs/promises';

const PATH = "../../../scrivener/Datable.mjs"
import { Datable, Dataccess, Database } from "../../scrivener/Datable.mjs"

const testFilePath = 'data-folder/testdbfile'
const testFilePersistentPath = 'data-folder/testdbfilepersistent'
class SimpleDoc {
  constructor(title, content) {
    this.title = title
    this.content = content
  }
}

class SimpleAuthor {
  constructor(name, bio) {
    this.name = name
    this.bio = bio
  }
}

// TODO setup/teardown

describe('Testies', function() {

  // this is me, testing things
  it('writes unicode codepoints to a file', async function() {
    return
    const file = await fs.open('note-folder/dbfile', 'a+');
    // const buf;
    
    file.writeFile('\u{1F310}-')
      .then(_ => file.close())

    file.readFile()
  }) 

})

describe('Dataccess', function() {
  before(function() {

  })

  this.afterAll(function() {
    fs.rm(testFilePath)
  })

  it('loads data from a file', async function() {
    let dacc = await Dataccess.initFromFile(testFilePath)
    dacc.register(SimpleDoc)
    dacc.register(SimpleAuthor)
  })

  it('writes data to a file', async function() {
    let dacc = await Dataccess.initFromFile(testFilePath)
    dacc.register(SimpleDoc)
    dacc.register(SimpleAuthor)
    const values = [
      new SimpleAuthor("Tim", "Writer, actor, provocateur"),
      new SimpleDoc("How to get away with murder in 3 easy steps", "Step 1: Look behind you right now"),
      new SimpleAuthor("Henry", "Bloggeur. Farrfetched.")
    ]
    Promise.all(values.map( v => dacc.saveInstance(v)) )
      .then(_ => fs.readFile(testFilePath, { flag: 'r+' } ))
      .then(str => assert(str.length > 0))
  })

  it('loads data from a file', async function() {
    let dacc = await Dataccess.initFromFile(testFilePersistentPath)
    dacc.register(SimpleDoc)
    dacc.register(SimpleAuthor)

    // this is a bit prescriptive, "loads data from a file" doesn't necessarily mean we just test loadAllInstances
    // will likely need to iterate on these tests too. For example put these in a test of specifically the
    // loadAllInstances method
    let simDocs = dacc.loadAllInstances(SimpleDoc)
    let simAuthor = dacc.loadAllInstances(SimpleAuthor)

    assert(simDocs.every( obj => obj instanceof SimpleDoc))
    assert(simAuthor.every( obj => obj instanceof SimpleAuthor))
    
  })

})