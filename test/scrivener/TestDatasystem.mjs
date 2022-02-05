'use strict';

import assert from 'assert';
import fs from 'fs/promises';

const PATH = "../../../scrivener/Datable.mjs"
import Datable, { isDatable } from '../../scrivener/datasystem/Datable.mjs';
import Dataccess from "../../scrivener/datasystem/Dataccess.mjs"
import Database from "../../scrivener/datasystem/Database.mjs"

const baseDirectory = 'data-folder'
const testFilePath = `${baseDirectory}/testdbfile`
const testFilePathDatabase = `${baseDirectory}/testdbfile2`
const testFilePersistentPath = `${baseDirectory}/testdbfilepersistent`
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

describe('Datasystem', function () {

  // this is me, testing things
  it('writes unicode codepoints to a file', async function () {
    return
    const file = await fs.open('note-folder/dbfile', 'a+');
    // const buf;

    file.writeFile('\u{1F310}-')
      .then(_ => file.close())

    file.readFile()
  })

  describe('Database', function () {
    const data1 = { id: 1, random: 'data' }
    const data2 = { id: 2, something: 5 }
    const writeLoc = `${baseDirectory}/temp`
    const writtenContents = `${JSON.stringify(data1)}\n${JSON.stringify(data2)}`

    this.beforeAll(function () {
      const fileOps = [
        fs.writeFile(testFilePathDatabase, writtenContents),
      ]
      return Promise.all(fileOps)
    })
    this.afterAll(function () {
      const fileOps = [
        fs.rm(testFilePathDatabase),
        fs.rm(writeLoc)
      ]
      return Promise.all(fileOps)
    })
    describe('save', function () {
      it('saves to a file', async function () {
        const db = await Database.initFileDB(writeLoc)

        // forcing save order
        // TODO the DB interface is a bit awkward. It mandates IDs without specifying schema. It's possible to save
        // the content without saving the IDs which we don't want. Conclusion: move ID metadata to the DB. It has
        // responsibility over identification tracking, and can supply the injected dependency for new items. Or
        // better yet don't make Datable responsible for the ID at all, push metadata to the DB! Datasys might have
        // metadata on top of it too. Different classes of information. When loads are made, and when we get to
        // references and dereferencing, it will have to go to the DB. Eventually the DB will make smart decisions
        // about when to write/load to the disk, buffering, managing live memory vs only loading if it's marked for
        // needing an update.
        await Promise.resolve()
          .then(_ => db.save(data1.id, data1))
          .then(_ => db.save(data2.id, data2))

        const contents = await fs.readFile(writeLoc, { encoding: 'utf8', flag: 'r+' })
        assert.strictEqual(contents, writtenContents)
      })
    })

    describe('load', function () {
      it('loads data from a file', async function () {
        const db = await Database.initFileDB(testFilePathDatabase)
        const [d1, d2] = await Promise.all([await db.load(1), await (db.load(2))])
        assert(data1.random === d1?.random)
        assert(data2.something === d2?.something)
      })
    })
  })


  describe('Dataccess', function () {
    before(function () {

    })

    this.afterAll(function () {
      fs.rm(testFilePath)
    })

    it('makes instances of registered classes datable', async function () {
      let dacc = await Dataccess.initFromFile(testFilePath)
      dacc.register(SimpleDoc)
      dacc.register(SimpleAuthor)

      const d1 = new SimpleDoc('D1', 'D1 words')
      const a1 = new SimpleAuthor('A1', 'I am a simple author')

      assert(isDatable(d1))
      assert(isDatable(a1))


    })

    it('writes registered instances to a file', async function () {
      let dacc = await Dataccess.initFromFile(testFilePath)
      dacc.register(SimpleDoc)
      dacc.register(SimpleAuthor)
      const values = [
        new SimpleAuthor("Tim", "Writer, actor, provocateur"),
        new SimpleDoc("How to get away with murder in 3 easy steps", "Step 1: Look behind you right now"),
        new SimpleAuthor("Henry", "Bloggeur. Farrfetched.")
      ]
      Promise.all(values.map(v => dacc.saveInstance(v)))
        .then(_ => fs.readFile(testFilePath, { flag: 'r+' }))
        .then(str => assert(str.length > 0))
    })

    it('loads all registered of a type from a file', async function () {
      let dacc = await Dataccess.initFromFile(testFilePersistentPath)
      dacc.register(SimpleDoc)
      dacc.register(SimpleAuthor)

      // this is a bit prescriptive, "loads data from a file" doesn't necessarily mean we just test loadAllInstances
      // will likely need to iterate on these tests too. For example put these in a test of specifically the
      // loadAllInstances method
      let simDocs = dacc.loadAllInstances(SimpleDoc)
      let simAuthor = dacc.loadAllInstances(SimpleAuthor)

      assert(simDocs.every(obj => obj instanceof SimpleDoc))
      assert(simAuthor.every(obj => obj instanceof SimpleAuthor))

    })

  })
})