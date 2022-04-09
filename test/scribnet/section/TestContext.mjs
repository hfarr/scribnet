'use strict'
import assert from 'assert';
import { testAll, DocParser, DocPrinter } from '../../helpers.mjs';
import { parseDoc, printDoc } from '../../helpers.mjs';
import { parseContext, printContext } from '../../helpers.mjs';

const PATH = "/home/henry/dev/scribnet/views"
const { Doc, Context, MixedContext, Segment, Gap } = await import(`${PATH}/js/scribnet/section/index.mjs`)

describe('Context', function () {

  const testContext1 = Context.from(Segment.from(...'Aaa'), Segment.from(...'Bbb'), Segment.from(...'Ccc'))
  const testContext2 = Context.from()
  const testContext3 = Context.from(Segment.from(...'Ddd'), Segment.from(...'Eee'))
  const testContext4 = Context.from(Segment.from(...'Fff'), Segment.from(...'Ggg'))
  const testDoc = Doc.from(testContext1, testContext2, testContext3, testContext4)


  const testNestedContext = Context.createContext('ul',
    Context.createContext('li', Segment.from('A')),
    Context.createContext('li', Segment.from('B')),
    Context.createContext('li',
      Segment.from('C'),
      Context.createContext('ul',
        Context.createContext('li', Segment.from(...'cA')),
        Context.createContext('li', Segment.from(...'cB')),
        Context.createContext('li', Segment.from(...'cC')),
        Context.createContext('li', Segment.from(...'cD'))
      ),
    ),
    Context.createContext('li', Segment.from('D')),
  )

  const testNestedContextAlt = testNestedContext.copy()
  testNestedContextAlt.subPieces[2] = Context.createContext('ul',
    Context.createContext('li', Segment.from(...'.A')),
    Context.createContext('li', Segment.from(...'.B')),
    Context.createContext('li', Segment.from(...'.C')),
    Context.createContext('li', Segment.from(...'.D')),
  )

  describe('insertBoundary', function () {

    it('creates a new Segment if the context has none before inserting', function () {

      const testContext = Context.from()
      const result = testContext.insertBoundary(0, 'test string')

      assert.strictEqual(testContext.segments.length, 0, 'expect test component to not have any Segment')
      assert.strictEqual(result.segments.length, 1, 'expect result to have a single Segment')
      assert.strictEqual(result.characters.join(''), 'test string')

    })

  })

  describe('indentation', function () {

    it('has a default indentation of 0', function () {
      assert.strictEqual(testContext1.indentation, 0)
    })

    it('clamps indentation to gte 0', function () {

      const cases = [
        testContext1.indent(-1),
        testContext1.indent(5),
        testContext1.indent(-4),
        testContext1.indent(0),
      ]

      cases.forEach(c => assert(c.indentation >= 0))

    })

  })

  describe('updateAttributes', function () {
    it('updates attributes', function () {
      const result1 = testContext1.updateAttributes({ blockTag: 'pre', indentDelta: 2 })
      assert.strictEqual(result1.block, 'pre')
      assert.strictEqual(result1.indentation, testContext1.indentation + 2)

    })
  })

  describe('Nested Context', function () {

    it('has the expected atoms', function () {

      const expected = 'ABCcAcBcCcDD'
      assert.strictEqual(testNestedContext.atoms.join(''), expected)
      assert.strictEqual(testNestedContext.length, expected.length)
    })

    it('computes the correct boundary locations', function () {
      const bl1 = testNestedContext._locateBoundary(0)
      const topLevel = [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [2, 1], [2, 2], [2, 3], [2, 4], [2, 5], [2, 6], [2, 7], [2, 8], [2, 9], [2, 10], [2, 11], [2, 12], [2, 13], [3, 0], [3, 1],]
      for (let i = 0; i < testNestedContext.boundariesLength; i++) {
        assert.deepStrictEqual(testNestedContext._locateBoundary(i), topLevel[i])
      }
      const nextLevel = [
        [0, 0], [0, 1], // the letter 'C'
        [1, 0], [1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [1, 6], [1, 7], [1, 8], [1, 9], [1, 10], [1, 11], [1, 12] // cA ... cD
      ]
      for (let i = 0; i < testNestedContext.subPieces[2].boundariesLength; i++) {
        assert.deepStrictEqual(testNestedContext.subPieces[2]._locateBoundary(i), nextLevel[i])
      }
      const lastLevel = [
        [0, 0], [0, 1], [0, 2],
        [1, 0], [1, 1], [1, 2],
        [2, 0], [2, 1], [2, 2],
        [3, 0], [3, 1], [3, 2],
      ]
      for (let i = 0; i < testNestedContext.subPieces[2].subPieces[1].boundariesLength; i++) {
        assert.deepStrictEqual(testNestedContext.subPieces[2].subPieces[1]._locateBoundary(i), lastLevel[i])
      }
    })

  })

})

describe('MixedContext', function () {

  const testMixed = Context.createContext('ul',
    Context.createContext('li', Segment.from(...'A')),
    Context.createContext('li', Segment.from(...'B')),
    Context.createContext('li', Segment.from(...'C'), Context.createContext('ul',
      Context.createContext('li', Segment.from(...'cA')),
      Context.createContext('li', Segment.from(...'cB')),
      Context.createContext('li', Segment.from(...'cC')),
      Context.createContext('li', Segment.from(...'cD')),
    )),
    Context.createContext('li', Segment.from(...'D')),
  )

  it('automatically converts Context to MixedContext', function () {
    assert(testMixed instanceof MixedContext) // ul
    assert(testMixed.subPieces[0] instanceof MixedContext)  // ul > li
    assert(testMixed.subPieces[1] instanceof MixedContext)
    assert(testMixed.subPieces[2] instanceof MixedContext)
    // TODO should, say, 'li' always convert to MixedContext?
    assert(testMixed.subPieces[2].subPieces[0] instanceof Context)        // ul > li > p
    assert(testMixed.subPieces[2].subPieces[1] instanceof MixedContext)   // ul > li > ul
    assert(testMixed.subPieces[2].subPieces[1].subPieces[0] instanceof MixedContext)   // ul > li > ul > li
    assert(testMixed.subPieces[2].subPieces[1].subPieces[1] instanceof MixedContext)   // ul > li > ul > li
    assert(testMixed.subPieces[2].subPieces[1].subPieces[2] instanceof MixedContext)   // ul > li > ul > li
    assert(testMixed.subPieces[2].subPieces[1].subPieces[3] instanceof MixedContext)   // ul > li > ul > li
    assert(testMixed.subPieces[3] instanceof MixedContext)
  })

  describe('contextBreakAt', function () {
    it('creates a new Context at the deepest level of nesting when a context break occurs', function () {

      // contextBreak on Contexts returns a list. In this case it will be a singleton list.
      const result = testMixed.contextBreakAt(10)[0]

      // want to be this way eventually. /eventually/. Kinda requires some peticular control logic that's to be implemented.
      // TODO we need that query/context DSL
      const desired = Context.createContext('ul',
        Context.createContext('li', Segment.from(...'A')),
        Context.createContext('li', Segment.from(...'B')),
        Context.createContext('li', Segment.from(...'C'), Context.createContext('ul',
          Context.createContext('li', Segment.from(...'cA')),
          Context.createContext('li', Segment.from(...'c')),  // split occurs on cB
          Context.createContext('li', Segment.from(...'B')),
          Context.createContext('li', Segment.from(...'cC')),
          Context.createContext('li', Segment.from(...'cD')),
        )),
        Context.createContext('li', Segment.from(...'D')),
      )
      const expected = Context.createContext('ul',
        Context.createContext('li', Segment.from(...'A')),
        Context.createContext('li', Segment.from(...'B')),
        Context.createContext('li', Segment.from(...'C'), Context.createContext('ul',
          Context.createContext('li', Segment.from(...'cA')),
          Context.createContext('li', Segment.from(...'c'), Segment.from(...'B')),  // split occurs on cB
          Context.createContext('li', Segment.from(...'cC')),
          Context.createContext('li', Segment.from(...'cD')),
        )),
        Context.createContext('li', Segment.from(...'D')),
      )

      assert(result.structureEq(expected), "expected result to structurally equal expected")
    })
    it('creates a new Context at the deepest level of nesting when a context break occurs at the end of the nested context', function () {

      // contextBreak on Contexts returns a list. In this case it will be a singleton list.
      // location 11
      const result = testMixed.contextBreakAt(11)[0]

      const expected = Context.createContext('ul',
        Context.createContext('li', Segment.from(...'A')),
        Context.createContext('li', Segment.from(...'B')),
        Context.createContext('li', Segment.from(...'C'), Context.createContext('ul',
          Context.createContext('li', Segment.from(...'cA')),
          Context.createContext('li', Segment.from(...'cB'), Segment.from()),  // split occurs on cB
          Context.createContext('li', Segment.from(...'cC')),
          Context.createContext('li', Segment.from(...'cD')),
        )),
        Context.createContext('li', Segment.from(...'D')),
      )

      assert(result.structureEq(expected), "expected result to structurally equal expected")
    })

  })

  describe('contextSplit', function () {
    const component = MixedContext.createContext('ul', 
      MixedContext.createContext('li', 
        Context.createContext('h1', Segment.from(...'aaa')),
        Context.createContext('h2', Segment.from(...'bbb')),
        Context.createContext('h3', Segment.from(...'ccc')),
      )
    )

    it('creates a new MixedContext at the deepest nested, above the Context', function (){
      const expected = MixedContext.createContext('ul', 
        MixedContext.createContext('li', 
          Context.createContext('h1', Segment.from(...'aaa')),
          Context.createContext('h2', Segment.from(...'b')),
        ),
        MixedContext.createContext('li', 
          Context.createContext('p', Segment.from(...'bb')),
          Context.createContext('h3', Segment.from(...'ccc')),
        )
      )

      const actual = component.contextSplit(5)[0]

      assert(actual.structureEq(expected))
    })
    it('creates a new MixedContext at each splitable location', function () {
      const testCases = []
      for (let i = 0; i < component.boundariesLength; i++) {
        testCases.push(i)
      }

      // pre assertion
      assert.strictEqual(component.subPieces.length, 1)

      const testOne = idx => {
        const result = component.contextSplit(idx)[0]
        assert.strictEqual(result.subPieces.length, 2)
      }

      testAll(testOne, testCases)

    })
    it('does not split the top MixedContext given that the top MixedContext doesnt have a non-MixedContext sub section', function () {
      const testCases = []
      for (let i = 0; i < component.boundariesLength; i++) {
        testCases.push(i)
      }

      const testOne = idx => {
        const result = component.contextSplit(idx)
        assert.strictEqual(result.length, 1)
      }

      testAll(testOne, testCases)

    })
  })

  describe('deleteBoundary', function () {
    const parseDoc = string => (new DocParser(string)).parse()
    const parseContext = string => (new DocParser(string)).context()
    const printDoc = doc => (new DocPrinter(doc)).print()

    const component = parseContext(`
    ul < 
      li < h1 < 'A' > > 
      li < h1 < 'B' > 
        ul < 
          li < h2 < 'bA' > >
          li < h2 < 'bB' > > 
        > 
      > 
      li < h1 <'C'> >
    >`)

    it('merges nested contexts correctly', function () {

      const testCases = [
        { input: { callee: component.contextSplit(5)[0], args: [ 5, 6 ] }, expected: component },
        { input: { callee: component, args: [ 3, 4 ] }, expected: parseDoc(`
          ul <
            li < h1 < 'A' > > 
            li < h1 < 'BbA' > 
              ul <
                li<
                  h2 < 'bB' > 
                >
              >
            > 
            li < h1 < 'C' > >
          >
        `).subPieces[0] },
/*
Below example is from an earlier bug

        og      3,4
        |'A'||'B'||'bA'||'bB'||'C'|
                  |----||----|     
                  |-h2-||-h2-|     
        |---||---||-li-||-li-||---|
        |h1-||h1-||----ul----||h1-|
        |li-||-------li------||li-|
        |------------ul-----------|

                 ||        <-  deleteBoundary(3,4)

        actual                                             |expected
        |'A'||'B'||'bA'||'bB'||'C'|                        |'A'||'BbA'||'bB'||'C'|
                  |----||----|                                         |----|     
                  |-h2-||-h2-|                                         |-h2-|     
        |---||---||-li-||-li-||---|                        |---||-----||-li-||---|
        |h1-||-------h1------||h1-|                        |h1-||-h1--||-ul-||h1-|
        |li-||-------li------||li-|                        |li-||-----li----||li-|
        |------------ul-----------|                        |---------ul----------|

        prettyprint of Actual
        'ul <
          li <
            h1 < 'A' >
          >
          li <
            h1 <
        'B'       li <
                h2 < 'bA' >
              >
              li <
                h2 < 'bB' >
              >
            >
          >
          li <
            h1 < 'C' >
          >
        >
        '
*/        
      ]

      const testOne = ({input: { callee, args }, expected}, testCaseNum) => { 
        const actual = callee.deleteBoundary(...args)

        assert.strictEqual(printDoc(actual), printDoc(expected), `Test case ${testCaseNum}: Expected to be structurally equivalent.`)
        // assert(actual.structureEq(expected), `Test case ${testCaseNum}: Expected to be structurally equivalent.`)
      }
      testAll(testOne, testCases)

    })
  })
})

describe('ListContext', function () {
  const nestedList = parseContext(`
    ul < 
      li< p<'A'> >       # 0-1
      li< p<'B'>         # 2-3
        ul < 
          li< p<'bA'> >  # 4-6
          li< p<'bB'> >  # 7-9
        >
      >
      li < p<'C'> >      # 10-11
    >
  `)

  describe('increaseIndent', function () {

    it('increases nesting of the list', function () {
      const expected = parseContext(`
        ul<li< ul < 
          li< p<'A'> >       # 0-1
          li< p<'B'>         # 2-3
            ul < 
              li< p<'bA'> >  # 4-6
              li< p<'bB'> >  # 7-9
            >
          >
          li < p<'C'> >      # 10-11
        > >>
      `)

      const actual = nestedList.increaseIndent()

      assert.strictEqual(printContext(actual), printContext(expected))

    })
  })

  describe('decreaseIndent', function() {

    it('decreases nesting of the list', function () {
      const expected = [
        parseContext(`
          p<'A'>          # 0-1
        `),
        parseContext(`
          p< 'B' >        # 2-3
        `),
        parseContext(`
          ul < 
            li< p<'bA'> > # 4-6
            li< p<'bB'> > # 7-9
          >
        `),
        parseContext(`
          p < 'C' >       # 10-11
        `),
      ]

      const actual = nestedList.decreaseIndent()

      assert.deepStrictEqual(actual.map(printContext), expected.map(printContext))

    })
  })
})

describe('Gap', function () {

  const testSegments1 = [
    Segment.from(...'AAA'),
    Segment.from(...'BBB').applyTags(['B']),
    Segment.from(...'CCC'),
  ]
  const testSegments2 = [
    Segment.from(...'DDD'),
    Segment.from(...'EEE'),
  ]
  const testSegments3 = [
    Segment.from(...'FFF'),
  ]
  const testSegments4 = [
    Segment.from(...'GGG'),
  ]
  const testContext1 = Context.from(...testSegments1)
  const testContext2 = Context.from(...testSegments2)
  const testContext3 = Context.from(...testSegments3)
  const testContext4 = Context.from(...testSegments4)

  const gap = new Gap()
  const testDoc = Doc.from(gap, testContext1, gap, testContext2, gap, testContext3, gap, testContext4, gap)
  const tradDoc = Doc.from(testContext1, testContext2, testContext3, testContext4)

  // const result = testDoc.delete(0,9)
  const result2 = tradDoc.delete(0, 9)
  assert(true)

})
