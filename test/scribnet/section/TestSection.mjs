'use strict'
import assert from 'assert';

const PATH = "/home/henry/dev/scribnet/views"
const MODULE = "Section"
const { default: Section, AtomicSection } = await import(`${PATH}/js/scribnet/section/${MODULE}.mjs`)

describe(`${MODULE} module`, function () {

  const testString1 = "A test section"

  const basicSection = AtomicSection.from(...testString1)
  const basicSection_split6 = Section.from(AtomicSection.from(..."A test"), AtomicSection.from(..." section"))

  describe('Section', function () {
    it('equals itself', function() {
      assert(basicSection.eq(basicSection))
    })

    it('Has the right "atoms"', function() {
      assert.deepStrictEqual(basicSection.atoms.join(''), testString1)
    })

    it('is equal to its split', function() {
      assert(basicSection.split(6).eq(basicSection))
    })
  })


  describe('AtomicSection', function () {

  })
})