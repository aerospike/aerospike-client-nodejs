// *****************************************************************************
// Copyright 2018 Aerospike, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License")
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
// *****************************************************************************

const util = require('util')

function str2num (value) {
  return isNaN(value) ? value : +value
}

// @param { String[] } binStrs - list of "<name>=<value>" pairs
exports.parseBins = function (binStrs) {
  return binStrs.reduce((bins, current) => {
    const [name, value] = current.split('=')
    bins[name] = str2num(value)
    return bins
  }, {})
}

exports.printRecord = function (record) {
  const key = record.key.key || record.key.digest.toString('hex')
  console.info('%s: %s', key, util.inspect(record.bins))
}
