
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
      const temp = Object.create(SomeDatable.prototype)
      const actual = temp.deserialize(serialized)

      const expected = original

      assert.strictEqual(expected.a, actual.a)
      assert.strictEqual(expected.b, actual.b)
      assert.strictEqual(actual.a.constructor, String)
      assert.strictEqual(actual.b.constructor, Buffer)

    })
  })
})