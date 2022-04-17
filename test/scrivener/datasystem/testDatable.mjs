
import assert from 'assert'

import Datable, { isDatable } from '../../../scrivener/datasystem/Datable.mjs';
// import Dataccess from "../../../scrivener/datasystem/Dataccess.mjs"

describe('Datable', function() {

  describe('Serialization', function() {

    it('serializes correctly', function () {

      // const SomeDatable = class { constructor(a, b) { this.a = a; this.b = b } }
      class SomeDatable { constructor(a, b) { this.a = a; this.b = b } }
      Datable.databilize(SomeDatable)

      const original = new SomeDatable('Hi', Buffer.from('hey'))

      const serialized = original.serialize()
      const actual = Object.create(SomeDatable.prototype)
      actual.deserialize(serialized)  // not fond of this interface

      const expected = original

      assert.deepStrictEqual(actual.a, expected.a)
      assert.deepStrictEqual(actual.b, expected.b)
      assert.strictEqual(actual.a.constructor, String)
      assert.strictEqual(actual.b.constructor, Buffer)

    })
  })
})