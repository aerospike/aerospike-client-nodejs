var count = 0
var limit = 1

function reset () {
  count = 0
}

function setLimit (i) {
  limit = i
}

function current () {
  return count
}

function next (fn, arg, done) {
  count++
  if (count < limit) {
    fn(arg, done)
  } else {
    done()
  }
}

module.exports = {
  reset: reset,
  setLimit: setLimit,
  next: next,
  current: current
}
