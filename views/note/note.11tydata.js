module.exports = {
  eleventyComputed: {
    title: data => data.title ?? data.noteItem?.name
  }
}