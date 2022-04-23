
module.exports = function() {
  return {
    env: {
      DEVELOPMENT: (process.env.DEVELOPMENT ?? "true") === "true",
      ENVIRONMENT: process.env.ENVIRONMENT ?? "dev"
    }
  }
}