// *****************************************************************************
// Copyright 2016 Aerospike, Inc.
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

const RecordStream = require('./record_stream.js')
const dataTypes = require('./data_types')
const AerospikeError = dataTypes.AerospikeError

/**
 * @class Query
 */
function Query (query) {
  this._query = query
}

Query.prototype.execute = function () {
  var self = this
  var rs = new RecordStream()

  var onResult = function onResult (res, key) {
    rs.emit('data', res, key)
  }

  var onError = function onError (error) {
    error = new AerospikeError(error)
    rs.emit('error', error)
  }

  var onEnd = function onEnd (end) {
    if (!self._query.isQuery && self._query.hasUDF) {
      self.scanId = end
      rs.emit('end', end)
    } else {
      rs.emit('end')
    }
  }

  if (this._query.isQuery) {
    // it is a query request.
    if (this._query.hasUDF) {
      // query UDF is not supported currently.
      throw new Error('Query UDF feature not supported')
    } else {
      // normal query and query aggregation is invoked here.
      this._query.foreach(onResult, onError, onEnd)
    }
  } else {
    // it is a scan request
    if (this._query.hasUDF) {
      // scan with a UDF - so background scan.
      // background scan does not return records. callback for record is NULL.
      this._query.foreach(null, onError, onEnd)
    } else {
      // it is a foreground scan or scan aggregation.
      this._query.foreach(onResult, onError, onEnd)
    }
  }

  return rs
}

Query.prototype.info = function (scanId, callback) {
  this._query.queryInfo(scanId, callback)
}
// alias for backwards compatibility
Query.prototype.Info = Query.prototype.info

module.exports = Query
