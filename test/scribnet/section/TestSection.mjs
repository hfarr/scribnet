'use strict'
import assert from 'assert';

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

  const innerStrings = [
    "Hey these strings are in a nested section",
    "we are testing just one layer of depth right now",
    "sufficient to cover recursive case? On espere"
  ]

  const listSections = testStrings.map(wrapAtomic)
  const complexSections = [
    ...testStrings.slice(0, 2).map(wrapAtomic),
    Section.from(...innerStrings.map(wrapAtomic)),
    ...testStrings.slice(2).map(wrapAtomic)
  ]

  const basicSection = Section.from(...listSections)
  const nestedSection = Section.from(...complexSections)

  const SectionSubclassA = class extends Section { }
  const SectionSubclassB = class extends Section { }

  const AtomicSectionSubclassA = class extends AtomicSection { }

  const mixedSection = SectionSubclassA.from(...complexSections)


  describe('AtomicSection', function () {
    it('equals itself', function () {
      assert(basicAtomicSection.eq(basicAtomicSection))
    })

    it('Has the right "atoms"', function () {
      assert.deepStrictEqual(basicAtomicSection.atoms.join(''), string1)
    })

    it('is equal to its split', function () {
      for (let i = 0; i < basicAtomicSection.length; i++) {
        assert(Section.from(...basicAtomicSection.split(i)).eq(basicAtomicSection))
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
    const SectionLow = class extends AtomicSection {
      answers(func) { return func.name === 'answerLow' }
    }
    const SectionMid = class extends Section {
      answers(func) { return func.name === 'answerMid' }
    }
    const SectionHigh = class extends Section {
      answers(func) { return func.name === 'answerHigh' }
    }

    const lowSections1 = [
      SectionLow.from(...'AAAAA'),
      SectionLow.from(...'BBBBB'),
    ]
    const lowSections2 = [
      SectionLow.from(...'CCCCC'),
      SectionLow.from(...'DDDDD'),
    ]
    const midSection1 = SectionMid.from(...lowSections1)
    const midSection2 = SectionMid.from(...lowSections2)
    const highSection = SectionHigh.from(midSection1, midSection2)

    const answerLow = a => a
    const answerMid = a => a
    const answerHigh = a => a


    it('equals itself', function () {
      assert(basicSection.eq(basicSection))
      assert(nestedSection.eq(nestedSection))
    })
    it('is equal to its split', function () {
      for (let i = 0; i < basicSection.length; i++) {
        assert(Section.from(...basicSection.split(i)).eq(basicSection))
      }
      for (let i = 0; i < nestedSection.length; i++) {
        assert(Section.from(...nestedSection.split(i)).eq(nestedSection))
      }
    })

    describe('delete', function () {
      it('deletes correctly', function () {
        const result = basicSection.delete(10, 23)
        const expected = Section.from(...["Some cool don't have to be just text though", ...testStrings.slice(2)].map(wrapAtomic))
        assert(result.eq(expected))
      })
      it('deletes nested correctly', function () {
        const result = nestedSection.delete(50, 80)
        const expected_str = nestedSection.atoms.join('').substring(0, 50) + nestedSection.atoms.join('').substring(80)
        const expected = AtomicSection.from(...expected_str)
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
      it('inserts nested correctly', function () {
        const insertionString = " and I am very excited about that. "
        const originalString = nestedSection.atoms.join('')
        const expectedString = originalString.substring(0, 97) + insertionString + originalString.substring(97)

        const result = nestedSection.insert(97, insertionString)
        const expected = AtomicSection.from(...expectedString)
        assert(result.eq(expected))
      })
      it('does not mutate original', function () {
        basicSection.insert(14, "new text!")
        assert(basicSection.eq(Section.from(...listSections)))
      })
    })

    describe('operate', function () {

      it('applies correctly', function () {
        const originalString = nestedSection.atoms.join('')
        const expectedString = originalString.substring(0, 50) + originalString.substring(50, 80).toUpperCase() + originalString.substring(80)

        const result = nestedSection.operate(a => a.toUpperCase(), 50, 80)
        const expected = AtomicSection.from(...expectedString)
        assert(result.eq(expected))
      })

    })

    describe('mapRange', function () {

      it('splits when child answers', function () {
        const mapRangeLow = highSection.mapRange(answerLow, 8, 17)
        const mapRangeMid = highSection.mapRange(answerMid, 8, 17)
        // TODO mapRange assumes you are doing work on the inner Sections.
        // if the outermost "answers" then you could just perform the operation then and there
        // what we might want to do is handle the case where the outermost does handle the 
        // function- but that would probably end up returning a list of instances of that
        // kind of Section. Not as nice to use, and not a worthy enough use case to waste 
        // the effort coding to handle—for now (use 'operate' at that point)
        // const mapRangeHigh = highSection.mapRange(answerHigh, 8, 17) 

        // Assert.equal(actual, expected)
        assert.equal(mapRangeLow.subPieces.length, highSection.subPieces.length)
        assert.equal(mapRangeMid.subPieces.length, 4)
        // assert.equal(mapRangeHigh.subPieces.length, 3)

        assert(true)
      })

    })

    describe('split', function () {

      it('preserves class', function () {
        const [start, end] = mixedSection.split(10)
        assert(start instanceof SectionSubclassA)
        assert(end instanceof SectionSubclassA)
      })
    })


  })
})