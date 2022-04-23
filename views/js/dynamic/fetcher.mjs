
function query(url, requestBody) {
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(requestBody)
  }

  return fetch(url, options)
    .then(async res => ({ code: res.status, body: await res.json() }) )
}

function queryGet(url, params) {
  const options = {
    method: 'GET',
    headers: {
      // 'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    // body: JSON.stringify(requestBody)
  }

  return fetch(url, options)
    .then(async res => ({ code: res.status, body: await res.json() }) )
}

function gqlQuery(content, variables) {
  const requestBody = {
    query: content,
    variables: variables ?? null
  }
  return query('/api/graphql', requestBody)
    .then(res => res.body.data)
}


// TODO add query for mutation?

globalThis.query = query
globalThis.queryGet = queryGet
globalThis.gqlQuery = gqlQuery

export { query, queryGet, gqlQuery }