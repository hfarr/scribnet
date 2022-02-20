
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

gql = (fragments, ...values) => {
  let result = fragments[0]
  for (let i = 0; i < values.length; i++ )
    result += `${values[i]}${fragments[i+1]}`
  return result
}

async function query(queryString, variables) {
  const requestBody = {
    query: queryString,
    variables,
  }
  const options = {
    method: 'POST',
    url: `${BASE_URL}/graphql`,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    data: JSON.stringify(requestBody)
  }
  return axios(options)
    .then(({ data: { data } }) => data)
    .catch(e => { console.log('Bad request', e); return Promise.reject()})
}

const { 
  DEV_STATIC_ONLY: cancelFetch="false",
  // Set DEV_FETCH_FAILS_BUILD to false if you want it to pull content when its available, and succeed otherwise
  DEV_FETCH_FAILS_BUILD: failBuildOnFetchFailure="true"
} = process.env

// Available under "notes" in data https://www.11ty.dev/docs/data-global/. The key follows the directory structure, generally.
if (cancelFetch === "true") {
  module.exports = []
} else {
  console.log("exporting")
  module.exports = function() {
    // return obbo.notes
    return query(`{ notes { data } }`)
      .then(({ notes }) => notes.map( ({ data }) =>  JSON.parse(data) ))
      .catch(err => (failBuildOnFetchFailure === "true") ? err : [] )
  }
}
