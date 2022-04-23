
// Using pagination
// https://www.11ty.dev/docs/pages-from-data/

module.exports = function(eleventyConfig) {

  eleventyConfig.addPassthroughCopy("views/css");
  eleventyConfig.addPassthroughCopy("views/js");

  if (process.env.IGNORE_FILES === 'true') {
    const ignoreDirs = ['note/','private/','dev/']
    const ignoreFiles = ['edit.njk','gallery.njk','landing-old.njk','notesample.md']
    ignoreDirs.forEach(dir => eleventyConfig.ignores.add(`./views/${dir}`))
    ignoreFiles.forEach(file => eleventyConfig.ignores.add(`./views/${file}`))
  }

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