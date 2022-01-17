
// Idea: Create one page for each note, fetching from the notes api directly
// execution: 
//    Create an 11ty collection of all the notes. Then for each template them
//    into separate files in the /note directory
//
// This file is global data
// https://www.11ty.dev/docs/data-js/
// 
// Then we have a template to produce notes
// https://www.11ty.dev/docs/pages-from-data/
// Tricky thing, I want the data we collect to be used in the rendering, as in, to create templates. Possible or nah?
// otherwise I'm writing a renderer here...

const axios = require('axios')

const BASE_URL = 'http://localhost:3000/api'

async function loadNote(name) {
  const options = {
    method: "GET",
    url: `${BASE_URL}/note/${name}`,
    // port: 3000
  }
  return axios(options)
}

// module.exports = function() {
//   return [ { name: "Static 1", content: "Note content for you" } ]
// }

module.exports = function() {
  const options = {
    method: "GET",
    url: `${BASE_URL}/notes`
  }
  return axios(options)
    .then(notes => Promise.all(notes.data.map(loadNote)))
    .then(responses => responses.map(r=>r.data))
    // .then(noteList => { return { notes: noteList } } )
}