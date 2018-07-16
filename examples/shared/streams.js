exports.consume = function (stream) {
  return new Promise(function (resolve, reject) {
    stream.on('error', reject)
    stream.on('end', resolve)
  })
}
