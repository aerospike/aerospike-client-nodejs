const semver = require('semver')

let prereleaseVersion = process.argv[2]
if (!prereleaseVersion) {
  console.error('Invalid version string')
  process.exit(1)
}

prereleaseVersion = semver.parse(prereleaseVersion)

prereleaseVersion.inc('release')
console.log(prereleaseVersion.format())
