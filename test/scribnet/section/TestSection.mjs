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


  const testSection = Section.from(
    Section.from(AtomicSection.from(...'AaA'), AtomicSection.from(...'BbB'), AtomicSection.from(), AtomicSection.from(...'CcC')),
    AtomicSection.from(...'DdD'),
    AtomicSection.from(...'EeE'),
    Section.from(AtomicSection.from()),
    AtomicSection.from(...'FfF'),
    Section.from(AtomicSection.from(...'GgG'), AtomicSection.from(...'HhH')),
    Section.from(AtomicSection.from(...'IiI')),
    AtomicSection.from(...'JjJ')
  )

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

    describe('_locateBoundary', function() {
      const testSection = Section.from(AtomicSection.from(...'AAAAA'), Section.from(), Section.from(AtomicSection.from(), AtomicSection.from()), AtomicSection.from(...'BBBBB'))

      it('yields expected boundary locations', function () {
        // overly prescriptive? maybe not. Suggests to me, though, that maybe I should just make this the implementation. Each section is just 1 + its normal length!
        // but I think I like demonstrating that the recursive definition is equal to this "closed form".
        assert.deepStrictEqual(testSection._locateBoundary(0), [0, 0] )
        assert.deepStrictEqual(testSection._locateBoundary(5), [0, 5] )
        assert.deepStrictEqual(testSection._locateBoundary(6), [1, 0] )
        assert.deepStrictEqual(testSection._locateBoundary(7), [2, 0] )
        assert.deepStrictEqual(testSection._locateBoundary(8), [2, 1] )
        assert.deepStrictEqual(testSection._locateBoundary(9), [3, 0] )
        assert.deepStrictEqual(testSection._locateBoundary(10), [3, 1] )
        assert.deepStrictEqual(testSection._locateBoundary(14), [3, 5] )
      })
    })

    describe('boundariesLength', function() {
      it('considers topologically overlapping boundaries the same', function() {
        // this is my way of saying that when two Section have a boundary in the same "place" it is considered one "boundary"
        // as a whole. For example, say a Section contains two AtomicSection. on the whole there are 3 Boundary,
        // far left, one between the AtomicSection, far right. On the far left the Section itself would contribute 
        // a boundary and so would the left AtomicSection. Same for the right. We don't want to double count them.

        assert.equal(testSection.boundariesLength, 42)

      })
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
      it('deletes "within" a Section, if a delete is contained within a section.', function (){ // poor naming for this test. The idea: When deleting Section uses 'split' to cut out the deleted Section. but it doesn't join the pieces, it is a deep cut all the way down.
        const result = highSection.delete(2,3)
        assert.equal(result.subPieces.length, highSection.subPieces.length);
      })

      it('cuts across sections correctly', function () {
        const result = highSection.delete(8,12)
        assert.equal(result.subPieces.length, highSection.subPieces.length);
      })
      it('cuts out interior sections', function() {
        const testSection = Section.from(...["AAA", "BBB", "CCC"].map(wrapAtomic))

        const result = testSection.delete(2,7)

        assert.equal(result.subPieces.length, testSection.subPieces.length - 1)
        assert.equal(result.atoms.join(''), 'AACC')
      })

    })

    describe('deleteBoundary', function() {
      it('deletes correctly', function () {
        const result = testSection.deleteBoundary(4, 5)

        testSection.deleteBoundary(3, 4)

        const expectedString = 'AAABBBCCCAAABBBCCCAAABBBCCCAAA'

      })
    })

    describe('merge', function () {

      it('deeply joins', function () {
        const sec1 = Section.from(Section.from(AtomicSection.from(...'AaA')))
        const sec2 = Section.from(Section.from(AtomicSection.from(...'BbB')))
        const result = sec1.merge(sec2)
        const expectedString = 'AaABbB'

        assert.strictEqual(result.atoms.join(''), expectedString)
        assert.strictEqual(result.subPieces.length, 1)
        assert.strictEqual(result.subPieces[0].subPieces.length, 1)
        assert.strictEqual(result.subPieces[0].subPieces[0].subPieces.length, expectedString.length )
        // assert.strictEqual(result.subPieces[0].subPieces.length, 1)

      })
    })

    describe('insert', function () {
      // TODO add tests to exemplify differences between insert and insertBoundary (namely that insert skips length 0, or empty, Boundary)
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
      it('inserts at the end correctly', function () {
        const secLength = highSection.length
        const result1 = highSection.insert(secLength, "EEEEE")
        const result2 = highSection.insert(secLength + 10, "EEEEE")

        assert.equal(result1.atoms.join(''), 'AAAAABBBBBCCCCCDDDDDEEEEE')
        assert.equal(result2.atoms.join(''), 'AAAAABBBBBCCCCCDDDDDEEEEE')
      })
      it('supports negative indexing', function () {
        const section = Section.from(AtomicSection.from(...'Aaaaa'), Section.from(AtomicSection.from(...'Bbbbb'), AtomicSection.from(...'Ccccc')), AtomicSection.from(...'Ddddd'))

        const result1 = section.insert(-2, "XXX")
        const result2 = section.insert(-20, "XXX")

        assert.equal(result1.atoms.join(''), 'AaaaaBbbbbCccccDddXXXdd')
        assert.equal(result2.atoms.join(''), 'XXXAaaaaBbbbbCccccDdddd')
      })
      // it('supports negative indexing on an empty section', function () {
      //   // OK- it won't do this yet. I don't want to prescribe that inserting into an empty section will create an AtomicSection. At least,
      //   //  note before thinking about what should happen in that circumstance.
      //   const section = new Section()
      //   const result = section.insert(-2, "XXX")
      //   assert.equal(result.atoms.join(''), 'XXX')
      // })
    })

    describe('insertBoundary', function() {
      it('produces matching strings with identical insertions to adjacent boundaries', function() {

        const insertString = '___'
        const adjacentPairs = [
          [3,4],
          [7,8],
          [8,9],  // boundary 8 is the single boundary of an empty section so its adjacent to two other boundaries
          [12,13],
          [16,17],
          [20,21], 
          [21,22], // boundary 21 is another single boundary of an empty Section (one that contains an empty AtomicSection note)
          [25,26],
          [29,30],
          [33,34],
          [37,38],
        ]
        for (const [ b1, b2 ] of adjacentPairs ) {
          assert.deepStrictEqual(testSection.insertBoundary(b1, insertString).atoms, testSection.insertBoundary(b2, insertString).atoms)
        }
      })
    })

    describe('addSubSections', function(){ 
      it('appends to an empty section successfully', function() {
        const emptySec = Section.from()
        const appendee1 = Section.from(AtomicSection.from('AAA'), AtomicSection.from('BBB'))
        const appendee2 = AtomicSection.from('CCC')

        const result = emptySec.addSubSections(appendee1, appendee2)
        const expectedString = 'AAABBBCCC'
        assert.equal(result.atoms.join(''), expectedString)
      })
      it('supports chaining calls', function() {
        const emptySec = Section.from()
        const appendee1 = Section.from(AtomicSection.from('AAA'), AtomicSection.from('BBB'))
        const appendee2 = AtomicSection.from('CCC')

        const result = emptySec.addSubSections(appendee1).addSubSections(appendee2)
        const expectedString = 'AAABBBCCC'
        assert.equal(result.atoms.join(''), expectedString)
      })
      it('appends sections to the end', function () {
        const original = Section.from(AtomicSection.from('AAA'), AtomicSection.from('BBB'))
        const appended = AtomicSection.from('CCC')

        const result = original.addSubSections(appended, appended)
        const expectedString = 'AAABBBCCCCCC'

        assert.equal(result.atoms.join(''), expectedString)
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