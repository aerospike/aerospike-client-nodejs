const semver = require('semver')

const currentVersion = process.argv[2]

const version = semver.parse(currentVersion)

if (!version) {
  console.error('Invalid version string')
  process.exit(1)
}

version.prerelease = [];
console.log(version.format())