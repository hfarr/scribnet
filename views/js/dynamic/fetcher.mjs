
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
    .then(res => res.json())
}

function gqlQuery(content, variables) {
  const requestBody = {
    query: content,
    variables: variables ?? null
  }
  return query('/api/graphql', requestBody)
    .then(body => body.data)
}

globalThis.query = query
globalThis.gqlQuery = gqlQuery

export { query, gqlQuery }