module.exports = function(eleventyConfig) {

  eleventyConfig.addPassthroughCopy("views/css");
  eleventyConfig.addPassthroughCopy("views/js");

  return {
    dir: {
      input: "views",
      output: "site"
    },
    templateFormats: [
      "html", "njk", "md"
    ]
  }
}