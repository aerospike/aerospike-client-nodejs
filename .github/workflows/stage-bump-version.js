const semver = require('semver')

const rawVersion = process.argv[2]

const rawDevVersion = process.argv[3]

const version = semver.parse(rawVersion)

const devVersion = semver.parse(rawDevVersion)


if (!version || !devVersion) {
  console.error('Invalid version string')
  process.exit(1)
}

if (semver.gt(devVersion, version)) {
  devVersion.prerelease = ['rc', 1];
  console.log(devVersion.format())
}
else{
  version.inc('prerelease', 'rc')
  console.log(version.format()) 
}