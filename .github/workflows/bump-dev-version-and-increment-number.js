const semver = require('semver')

const currentVersionString = process.argv[2]
const currentJfrogVersion = process.argv[3]

const version = semver.parse(currentVersionString)
const jfrogVersion = semver.parse(currentJfrogVersion)

if (!version || !jfrogVersion) {
  console.error('Invalid version string')
  process.exit(1)
}

if(version.major === jfrogVersion.major &&
   version.minor === jfrogVersion.minor &&
   version.patch === jfrogVersion.patch){
   if(jfrogVersion.prerelease){
      jfrogVersion.inc('prerelease', 'dev')
      console.log(jfrogVersion.format())

   }
   else{
      version.prerelease = ['dev', 1];
      console.log(version.format())
   }
}
else if(version.major > jfrogVersion.major ||
   version.minor > jfrogVersion.minor ||
   version.patch > jfrogVersion.patch){
  //console.log("Current package version higher than current JFrog version.")
  version.prerelease = ['dev', 1];
  console.log(version.format())
}
else if(version.major < jfrogVersion.major ||
   version.minor < jfrogVersion.minor ||
   version.patch < jfrogVersion.patch){
  //console.log("Current JFrog version higher than current package version.")
  jfrogVersion.inc('prerelease', 'dev')
  console.log(jfrogVersion.format())

}