const semver = require('semver')

let currentTag = process.argv[2]
currentTag = semver.parse(currentTag)

if (!currentTag) {
  console.error('Invalid version string')
  process.exit(1)
}

if (currentTag.prerelease === false) {
      currentTag.inc('prepatch')
}
currentTag.inc('prerelease', 'dev')
console.log(currentTag.format())
