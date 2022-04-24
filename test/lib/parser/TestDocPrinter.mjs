
import assert from 'assert';
const PATH = "/home/henry/dev/scribnet/views"

const { Segment, Context, Doc } = await import(`${PATH}/js/scribnet/section/index.mjs`)

// Parsing is tested in the other module so I feel relatively comfortable using it to validate tests.
// I'll note that that parser doesn't rely on the Printer so there shouldn't be a risk of circular breakage.
import { parseDoc, printDocCompact } from '../../helpers.mjs'
import { DocPrinter } from '../../../views/js/parser/index.mjs'

describe('DocPrinter', function () {

  describe('print', function () {

    it('prints Docs containing simple contexts and segments', function() {

      const sample = parseDoc("h1 < 'A List' > ul < li<p<'A'>> li<p<'B'>ul< li<p<'aB'>> li<p<'bB'>> >> li<p<'C'>>> ")

      const actual = (new DocPrinter(sample)).print()
      const expected =  `\
Doc <
  h1 < 'A List'>
  ul <
    li <
      p < 'A'>
    >
    li <
      p < 'B'>
      ul <
        li <
          p < 'aB'>
        >
        li <
          p < 'bB'>
        >
      >
    >
    li <
      p < 'C'>
    >
  >
>
`
      assert.strictEqual(actual, expected)
      

    })


    it('prints tagged segments', function () {
      const sample = parseDoc("p<(strong, em)'A' 'B' > p <'C'>")
      const actual = (new DocPrinter(sample)).print()

      const expected = `\
Doc <
  p < (strong, em)'A' 'B'>
  p < 'C'>
>
`
      assert.strictEqual(actual, expected)

    })
  })
})

describe('invertibility', function () {
  it('is inverse of parsing', function () {
    // technically.. this is describing the injective property of parsing, rather than stating that printing is the inverse of parsing. Printing could be the inverse image of parsing.
    //  Im(x) = y   =>  Im-1(y) = x, or informally, no two points in the domain map to the same point in the co domain.
    //  also implies codomain >= domain
    const sample = parseDoc("h1 < 'A List' > ul < li<p<'A'>> li<p<'B'>ul< li<p<'aB'>> li<p<'bB'>> >> li<p<'C'>>> ")
    const original = (new DocPrinter(sample)).print() // x

    const actual = (new DocPrinter(parseDoc(original))).print() // f^-1(f(x))

    // f^-1(f(x)) == x
    assert.strictEqual(actual, original)

  })
})