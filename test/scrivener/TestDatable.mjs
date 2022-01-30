'use strict';

import assert from 'assert';
import fs from 'fs/promises';

describe('Testies', function() {

  it('opens a file', async function() {
    const file = await fs.open('note-folder/dbfile', 'a+');
    // const buf;
    
    file.writeFile('\u{1F310}-')
      .then(_ => file.close())

    file.readFile()
  }) 
})