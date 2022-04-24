
import assert from 'assert'

import HTMLRenderer from '../../../views/js/scribnet/document/renderer/HTMLRenderer.mjs'

import { testAll, parseDoc, printDoc } from '../../helpers.mjs'

describe('HTMLRenderer', function () {

  const testOne = ({scribdoc, expected, caseNum }) => {
    const doc = parseDoc(scribdoc)
    const renderer = new HTMLRenderer()
    const actual = renderer.toHTML(doc)
    assert.strictEqual(actual, expected, `Test case [${caseNum}]: Expect to be equal`)
  }

  it('renders html', function() {

  })

  it('escapes correctly', function() {
  
    const tests = [
      { scribdoc: `p< '<>&"\\'' >`, expected: '<p>&lt;&gt;&amp;&quot;&#39;</p>'}
    ]

    testAll(testOne, tests)

  })
})