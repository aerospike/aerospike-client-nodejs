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
 * @classdesc Stream of database records (full or partial) returned by {@link Query} or {@link Scan} operations.
 *
 * *Note:* Record stream currently does not support Node.js'
 * <code>Stream#pause</code> and <code>Stream#resume</code> methods, i.e. it
 * always operates in flowing mode. That means data is read from the Aerospike
 * database and provided to your application as fast as possible. If no data
 * event handlers are attached, then data will be lost.
 *
 * #### Aborting a Query/Scan
 *
 * A query or scan operation can be aborted by calling the {@link
 * RecordStream#abort} method at any time. It is no possible to continue a
 * record stream, once aborted.
 *
 * @extends stream
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 * Aerospike.connect((error, client) => {
 *   if (error) throw error
 *   var recordsSeen = 0
 *   var scan = client.scan('test', 'demo')
 *   var stream = scan.foreach()
 *
 *   stream.on('error', (error) => {
 *     console.error(error)
 *     throw error
 *   })
 *   stream.on('data', (record) => {
 *     recordsSeen++
 *     console.log(record)
 *     if (recordsSeen > 1000) {
 *       stream.abort() // We've seen enough!
 *     }
 *   })
 *   stream.on('end', () => {
 *     console.info(stream.aborted ? 'scan aborted' : 'scan completed')
 *     client.close()
 *   })
 * })
 */
function RecordStream (client) {
  /**
   * <code>true</code> if the scan has been aborted by the user; <code>false</code> otherwise.
   * @member {boolean} RecordStream#aborted
   * @see {@link RecordStream#abort}
   */
  this.aborted = false

  // Keep a reference to the client instance even though it's not actually
  // needed to process the stream. This is to prevent situations where the
  // client object goes out of scope while the stream is still being processed
  // and the memory for the C++ client instance and dependent objects gets
  // free'd.
  this.client = client
}

inherits(RecordStream, stream)

RecordStream.prototype.writable = false
RecordStream.prototype.readable = true
RecordStream.prototype._read = function () {}

/**
 * @function RecordStream#abort
 *
 * @summary Aborts the query/scan operation.
 *
 * Once aborted, it is not possible to resume the stream.
 *
 * @since v2.0
 */
RecordStream.prototype.abort = function () {
  if (this.aborted) return
  this.aborted = true
  process.nextTick(this.emit.bind(this, 'end'))
}

/**
 * @event RecordStream#data
 * @param {?object} bins - The record bins; may be <code>null</code> if {@link Scan#nobins} is used.
 * @param {?object} meta - Record meta data, e.g. ttl, generation, etc.
 * @param {?Key} key - The record's key. By default the server only stores the
 * key digest unless <code>Aerospike.policy.key.SEND</code> is used; so the
 * <code>key</code> property of the returned Key object might be
 * undefined and only <code>digest</code> will be populated.
 */

/**
 * @event RecordStream#error
 * @type {AerospikeError}
 */

/**
 * @event RecordStream#end
 */

module.exports = RecordStream
