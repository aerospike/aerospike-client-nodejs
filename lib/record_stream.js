// *****************************************************************************
// Copyright 2013-2024 Aerospike, Inc.
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

'use strict'

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
 *
 * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
 * var config = {
 *   hosts: '192.168.33.10:3000',
 *   // Timeouts disabled, latency dependent on server location. Configure as needed.
 *   policies: {
 *     scan : new Aerospike.ScanPolicy({socketTimeout : 0, totalTimeout : 0}),
 *    }
 * }
 *
 * Aerospike.connect(config, (error, client) => {
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
function RecordStream (client, reduce) {
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

  /**
   * @member {?TopKReduce} RecordStream#reduce
   * @private
   *
   * Optional client-side Top-K reducer (see {@link Query#orderBy}/{@link
   * Query#topK}). When set, incoming records are routed through {@link
   * RecordStream#_pushRecord} into the reducer instead of being emitted
   * immediately; the reducer's best-first result is emitted only once the
   * underlying query/scan signals completion, via {@link
   * RecordStream#_pushEnd}. <code>null</code> for ordinary (non-Top-K)
   * queries and for scans, which behave exactly as before.
   */
  this.reduce = reduce || null
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
 * @function RecordStream#_pushRecord
 * @private
 *
 * @summary Delivers one record received from the native layer to this
 * stream's consumers. Called by {@link StreamCommand} once per record,
 * in place of emitting <code>'data'</code> directly, so that a {@link
 * TopKReduce} (when attached) can intercept every record before any of
 * them reach the caller. See {@link RecordStream#reduce}.
 *
 * @param {AerospikeRecord} record - the record delivered by the native layer.
 */
RecordStream.prototype._pushRecord = function (record) {
  if (this.reduce) {
    this.reduce.acceptPartial(record)
  } else {
    this.emit('data', record)
  }
}

/**
 * @function RecordStream#_pushEnd
 * @private
 *
 * @summary Signals that the underlying query/scan has finished (i.e.
 * every partition/node has reported in). Called by {@link StreamCommand}
 * in place of emitting <code>'end'</code> directly. If a {@link
 * TopKReduce} is attached, drains it first and emits its best-first
 * result as a burst of <code>'data'</code> events - honoring {@link
 * RecordStream#abort} if it is called mid-drain - before emitting
 * <code>'end'</code>.
 *
 * @param {*} state - pagination state to pass through to the
 * <code>'end'</code> event, same as today.
 */
RecordStream.prototype._pushEnd = function (state) {
  if (this.reduce) {
    const records = this.reduce.getResult()
    for (const record of records) {
      if (this.aborted) break
      this.emit('data', record)
    }
  }
  this.emit('end', state)
}

/**
 * @event RecordStream#data
 * @param {Record} record - Aerospike record incl. bins, key and meta data.
 * Depending on the operation, all, some or no bin values will be returned.
 */

/**
 * @event RecordStream#error
 * @type {AerospikeError}
 */

/**
 * @event RecordStream#end
 */

module.exports = RecordStream
