'use strict'
import assert from 'assert';
import { secureHeapUsed } from 'crypto';

const PATH = "/home/henry/dev/scribnet/views"
const MODULE = "Section"
const { default: Section, AtomicSection } = await import(`${PATH}/js/scribnet/section/${MODULE}.mjs`)

describe(`${MODULE} module`, function () {

  const testString1 = "A test section"

  const basicAtomicSection = AtomicSection.from(...testString1)
  const listSections = [
    AtomicSection.from(..."Some cool text"),
    AtomicSection.from(..."Sections don't have to be just text though"),
    AtomicSection.from(..."technically it's \"atoms\", loosely defined as indivisible"),
    AtomicSection.from(..."Probably easier for the user if they're homogeneous"),
    AtomicSection.from(..."but they don't have to be"),
  ]
  const basicSection = Section.from(...listSections)

  describe('Section', function () {
    it('equals itself', function () {
      assert(basicAtomicSection.eq(basicAtomicSection))
    })

    it('Has the right "atoms"', function () {
      assert.deepStrictEqual(basicAtomicSection.atoms.join(''), testString1)
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
        assert(basicAtomicSection.eq(AtomicSection.from(...testString1)))
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
        assert(basicAtomicSection.eq(AtomicSection.from(...testString1)))
      })
    })

  })


  describe('AtomicSection', function () {

    it('equals itself', function () {
      assert(basicSection.eq(basicSection))
    })
    it('is equal to its split', function () {
      for (let i = 0; i < basicSection.length; i++) {
        assert(basicSection.split(i).eq(basicSection))
      }
    })
  })
})