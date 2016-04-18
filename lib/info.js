// *****************************************************************************
// Copyright 2016 Aerospike, Inc.
//
// Licensed under the Apache License, Version 2.0 (the 'License')
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an 'AS IS' BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
// *****************************************************************************

/**
 * @module aerospike/info
 *
 * @description Utility methods for dealing with info data returned by Aerospike cluster nodes.
 *
 * @see {@link Client#info}
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 * Aerospike.connect((error, client) => {
 *   if (error) throw error
 *
 *   var infoCb = function (error, infoStr) {
 *     if (error) {
 *       console.error('error retrieving info: %s', error.message)
 *     } else {
 *       var info = Aerospike.info.parseInfo(infoStr)
 *       console.log(info) // => { features:
 *                         //      [ 'cdt-list',
 *                         //        'pipelining',
 *                         //        'geo',
 *                         //        ...,
 *                         //        'udf' ] }
 *     }
 *   }
 *   client.info('features', infoCb, () => client.close())
 * })
 */

function parseValue (value) {
  if (Number(value).toString() === value) {
    return Number(value)
  }
  return value
}

function parseKeyValue (str, sep1, sep2) {
  var result = {}
  str.split(sep1).forEach(function (kv) {
    if (kv.length > 0) {
      kv = kv.split(sep2, 2)
      result[kv[0]] = parseValue(kv[1])
    }
  })
  return result
}

/**
 * @function module:aerospike/info.parseInfo
 *
 * @summary Parses the info string returned from a cluster node into key-value pairs.
 *
 * @param {string} info - The info string returned by the cluster node.
 * @returns {Object} key-value pairs
 */
function parseInfo (info) {
  if (!info) return {}
  var infoHash = parseKeyValue(info, '\n', '\t')
  Object.keys(infoHash).forEach(function (key) {
    var value = infoHash[key]
    if ((typeof value === 'string') && value.indexOf(';') >= 0) {
      if (value.indexOf('=') >= 0) {
        value = parseKeyValue(value, ';', '=')
      } else {
        value = value.split(';')
      }
      infoHash[key] = value
    }
  })
  return infoHash
}

module.exports = {
  parseInfo: parseInfo
}
