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

function next (fn, arg) {
  count++
  if (count >= limit) {
    process.exit(0)
  } else {
    fn(arg)
  }
}

module.exports = {
  reset: reset,
  setLimit: setLimit,
  next: next,
  current: current
}
