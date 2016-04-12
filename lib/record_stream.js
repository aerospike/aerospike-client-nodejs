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

const stream = require('stream')
const inherits = require('util').inherits

/**
 * @class RecordStream
 * @extends stream
 */
function RecordStream () {
  /**
   * <code>true</code> if the scan has been aborted by the user; <code>false</code> otherwise.
   * @member {boolean} RecordStream#aborted
   * @see {@link RecordStream#abort}
   */
  this.aborted = false
}

inherits(RecordStream, stream)

RecordStream.prototype.writable = false
RecordStream.prototype.readable = true
RecordStream.prototype._read = function () {}

/**
 * @function RecordStream#abort
 *
 * @summary Aborts the scan operation.
 *
 * @description The abort() method is only supported on record streams
 * associated with scan operations, not query operations.
 */
RecordStream.prototype.abort = function () {
  if (this.aborted) return
  this.aborted = true
  process.nextTick(this.emit.bind(this, 'end'))
}

/**
 * @event RecordStream#data
 */

/**
 * @event RecordStream#error
 */

/**
 * @event RecordStream#end
 */

module.exports = RecordStream
