const semver = require('semver')

const currentVersion = process.argv[2]

const version = semver.parse(currentVersion)

if (!version) {
  console.error('Invalid version string')
  process.exit(1)
}

if (version.prerelease[0] === 'rc'){
  version.inc('prerelease', 'rc')
  console.log(version.format())
}
else {
  version.prerelease = ['rc', 1];
  console.log(version.format())

}