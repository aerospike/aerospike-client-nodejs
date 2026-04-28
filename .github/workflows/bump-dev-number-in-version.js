const semver = require('semver')

let currentTag = process.argv[2]
let bumpType = process.argv[3]
currentTag = semver.parse(currentTag)

if (!currentTag) {
  console.error('Invalid version string')
  process.exit(1)
}

if (currentTag.prerelease.length == 0) {
  currentTag.inc(`pre${bumpType}`)
}
currentTag.inc('prerelease', 'dev')
console.log(currentTag.format())
