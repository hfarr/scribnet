module.exports = {
  eleventyComputed: {
    title: data => data.title ?? data.noteItem?.name,
    resourceName: data => data.noteItem?.name
  }
}