const semver = require('semver')

const currentVersion = process.argv[2]

const version = semver.parse(currentVersion)

if (!version) {
  console.error('Invalid version string')
  process.exit(1)
}

if (version.prerelease[0] === 'dev'){
  version.inc('prerelease', 'dev')
  console.log(version.format())
}
else {
  version.prerelease = ['dev', 1];
  console.log(version.format())
}