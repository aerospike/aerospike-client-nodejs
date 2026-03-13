const semver = require('semver')

let currentVersion = process.argv[2]
currentVersion = semver.parse(currentVersion)

if (!currentVersion) {
  console.error('Invalid version string')
  process.exit(1)
}

if (currentVersion.prerelease === false) {
      currentVersion.inc('prepatch')
}
currentVersion.inc('prerelease', 'dev')
console.log(currentVersion.format())
