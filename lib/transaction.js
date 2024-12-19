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

const as = require('bindings')('aerospike.node')

const capacity = require('./txn_capacity')
const state = require('./txn_state')

const AerospikeError = require('./error')

const { _transactionPool } = require('./aerospike')

const UINT32_MAX = 0xFFFFFFFF

function isValidUint32 (value) {
  return value >= 0 && value <= UINT32_MAX
}

class Transaction {
  static state = state
  static capacity = capacity

  constructor (readsCapacity = capacity.READ_DEFAULT, writesCapacity = capacity.WRITE_DEFAULT) {
    /** @private */
    this.inDoubt = null
    /** @private */
    this.pooled = false
    /** @private */
    this.state = null
    /** @private */
    this.timeout = null
    /** @private */
    this.destroyed = false

    if (Number.isInteger(readsCapacity)) {
      if (Number.isInteger(writesCapacity)) {
        if (isValidUint32(readsCapacity)) {
          if (isValidUint32(writesCapacity)) {
            /** @private */
            this.readsCapacity = readsCapacity
            /** @private */
            this.writesCapacity = writesCapacity

            _transactionPool.pushTransaction(this)
            this.transaction = as.transaction({ readsCapacity, writesCapacity })
          } else {
            throw new RangeError('writesCapacity is out of uint32 range')
          }
        } else if (isValidUint32(writesCapacity)) {
          throw new RangeError('readsCapacity is out of uint32 range')
        } else {
          throw new RangeError('both readsCapacity and writesCapacity are out of uint32 range')
        }
      } else {
        throw new TypeError('Must specify a number for writesCapacity')
      }
    } else if (Number.isInteger(writesCapacity)) {
      throw new TypeError('Must specify a number for readsCapacity')
    } else {
      /** @private */
      this.readsCapacity = readsCapacity
      /** @private */
      this.writesCapacity = writesCapacity

      _transactionPool.pushTransaction(this)
      this.transaction = as.transaction({})
    }

    /** @private */
    this.id = this.transaction.getId()
  }

  /* getters */

  getDestroyed () {
    return this.destroyed
  }

  getId () {
    return this.id
  }

  getInDoubt () {
    if (this.destroyed) {
      return this.inDoubt
    }
    return this.transaction.getInDoubt()
  }

  getReadsCapacity () {
    return this.readsCapacity
  }

  getState () {
    if (this.destroyed) {
      return this.state
    }
    return this.transaction.getState()
  }

  getTimeout () {
    if (this.destroyed) {
      return this.timeout
    }
    return this.transaction.getTimeout()
  }

  getWritesCapacity () {
    return this.writesCapacity
  }

  /* setters */
  setTimeout (timeout) {
    if (this.destroyed) {
      throw new AerospikeError('Transaction is already complete')
    }
    return this.transaction.setTimeout(timeout)
  }

  /** @private */
  prepareToClose () {
    this.timeout = this.transaction.getTimeout()
    this.inDoubt = this.transaction.getInDoubt()
    this.state = this.transaction.getState()
    _transactionPool.totalReadsAndWrites -= (this.writesCapacity + this.readsCapacity)
    this.destroyed = true
  }

  /** @private */
  close () {
    if (this.destroyed === false) {
      this.prepareToClose()
      this.transaction.close()
    }
  }

  destroyAll () {
    _transactionPool.removeAllTransactions()
  }
}

module.exports = Transaction
