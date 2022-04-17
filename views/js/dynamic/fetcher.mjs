

function query(url, content, variables) {
  const requestBody = {
    query: content,
    variables: variables ?? null
  }
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(requestBody)
  }

  return fetch(url, options)
}

function gqlQuery(content, variables) {
  return query('/api/graphql', content, variables)
    .then(res => res.json())
    .then(body => body.data)
}

globalThis.query = query
globalThis.gqlQuery = gqlQuery

export { query, gqlQuery }