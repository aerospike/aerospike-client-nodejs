const semver = require('semver')

const currentJfrogVersion = process.argv[2]
const jfrogVersion = semver.parse(currentJfrogVersion)

if (!jfrogVersion) {
  console.error('Invalid version string')
  process.exit(1)
}

if (jfrogVersion.prerelease === false) {
      jfrogVersion.inc('prepatch')
}
jfrogVersion.inc('prerelease', 'dev')
console.log(jfrogVersion.format())
