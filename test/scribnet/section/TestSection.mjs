'use strict'
import assert from 'assert';
import { secureHeapUsed } from 'crypto';

const PATH = "/home/henry/dev/scribnet/views"
const MODULE = "Section"
const { default: Section, AtomicSection } = await import(`${PATH}/js/scribnet/section/${MODULE}.mjs`)

describe(`${MODULE} module`, function () {

  const wrapAtomic = atomList => AtomicSection.from(...atomList)

  const string1 = "A test section"

  const basicAtomicSection = AtomicSection.from(...string1)

  const testStrings = [
    "Some cool text",
    "Sections don't have to be just text though",
    "technically it's \"atoms\", loosely defined as indivisible",
    "Probably easier for the user if they're homogeneous",
    "but they don't have to be",
  ]

  const listSections = testStrings.map(wrapAtomic)
  const basicSection = Section.from(...listSections)

  describe('AtomicSection', function () {
    it('equals itself', function () {
      assert(basicAtomicSection.eq(basicAtomicSection))
    })

    it('Has the right "atoms"', function () {
      assert.deepStrictEqual(basicAtomicSection.atoms.join(''), string1)
    })

    it('is equal to its split', function () {
      for (let i = 0; i < basicAtomicSection.length; i++) {
        assert(basicAtomicSection.split(i).eq(basicAtomicSection))
      }
    })

    describe('delete', function () {
      it('deletes correctly', function () {
        const result = basicAtomicSection.delete(2, 7)
        const expected = AtomicSection.from(..."A section")
        assert(result.eq(expected))
      })
      it('does not mutate original', function () {
        basicAtomicSection.delete(2, 7)
        assert(basicAtomicSection.eq(AtomicSection.from(...string1)))
      })

    })

    describe('insert', function () {
      it('inserts correctly', function () {
        const result = basicAtomicSection.insert(2, "new ")
        const expected = AtomicSection.from(..."A new test section")
        assert(result.eq(expected))
      })
      it('does not mutate original', function () {
        basicAtomicSection.insert(2, "new ")
        assert(basicAtomicSection.eq(AtomicSection.from(...string1)))
      })
    })

  })


  describe('Section', function () {

    it('equals itself', function () {
      assert(basicSection.eq(basicSection))
    })
    it('is equal to its split', function () {
      for (let i = 0; i < basicSection.length; i++) {
        assert(basicSection.split(i).eq(basicSection))
      }
    })

    describe('delete', function () {
      it('deletes correctly', function () {
        const result = basicSection.delete(10, 23)
        const expected = Section.from(...["Some cool don't have to be just text though", ...testStrings.slice(2)].map(wrapAtomic))
        assert(result.eq(expected))
      })
      it('does not mutate original', function () {
        basicSection.delete(10, 23)
        assert(basicSection.eq(Section.from(...listSections)))
      })

    })

    describe('insert', function () {
      it('inserts correctly', function () {
        const result = basicSection.insert(14, "new text!")
        // in this case, insertion at a boundary
        const expected = Section.from(...[testStrings[0], "new text!", ...testStrings.slice(1)].map(wrapAtomic))
        assert(result.eq(expected))
      })
      it('does not mutate original', function () {
        basicSection.insert(14, "new text!")
        assert(basicSection.eq(Section.from(...listSections)))
      })
    })
  })
})