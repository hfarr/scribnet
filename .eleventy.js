module.exports = function(eleventyConfig) {



  return {
    dir: {
      input: "views",
      output: "site"
    },
    templateFormats: [
      "html", "njk"
    ]
  }
}