import DocParser from "./DocParser.mjs";
import DocPrinter from "./DocPrinter.mjs";


const parseDoc = string => (new DocParser(string)).parse()
const printDoc = doc => (new DocPrinter(doc)).print()

const parseContext = string => (new DocParser(string)).context()
const printContext = ctx => (new DocPrinter(ctx)).print()  // something about the interface here. heh. TODO DocPrinter doesn't really use the param passed to its constructor. OO is not particularly conducive to PrintyPrinting imo

// const convertCompact = docPrint => docPrint.replaceAll(/\n/g, '').replaceAll(/\s*(<|>)\s*/g,'$1').replace(/^Doc<(.*)>$/, '$1')
// should eliminate whitespace between quoted sections too, so that whitespace within quoted sections is preserved
// or I write, frankly, a new pretty printer for these cases.
const convertCompact = docPrint => docPrint.replaceAll(/\s*(<|>)\s*/g,'$1').replace(/^Doc<(.*)>$/, '$1')
const injectNewLines = compact => compact.replaceAll(/(ul|li)/, '\n$1')

const printDocCompact = doc => convertCompact(printDoc(doc))


// -----

// const sample = "h1 < 'A List' > ul < li<p<'A'>> li<p<'B'>ul< li<p<'aB'>> li<p<'bB'>> >> li<p<'C'>>> "

// const docParser = new DocParser(sample)
// const doc = docParser.parse()
// const docPrinter = new DocPrinter(doc)

// console.debug('testing')
// console.debug(doc.toString())
// console.debug(docPrinter.print())


export { parseDoc, printDoc, printDocCompact, parseContext, printContext }
