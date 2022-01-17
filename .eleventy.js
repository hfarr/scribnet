
// Using pagination
// https://www.11ty.dev/docs/pages-from-data/

module.exports = function(eleventyConfig) {

  eleventyConfig.addPassthroughCopy("views/css");
  eleventyConfig.addPassthroughCopy("views/js");

  // eleventyConfig.addNunjucksFilter("access", function(obj, attribute) {
  //   return obj[attribute]
  //   // return "NO"
  // })
  

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