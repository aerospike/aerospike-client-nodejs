// *****************************************************************************
// Copyright 2024 Aerospike, Inc.
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

const txnState = require('./txn_state')

// This is an arbitary limit provide to safe-guard against accidental over allocation by the user.
// In general, this limit should be high enough that users should never hit this mark under typical use.
const readWriteLimit = 500_000

/* private */
class TransactionPool {
  constructor (capacity = 128) {
    this.transactions = []
    this.capacity = capacity
    this.totalReadsAndWrites = 0
  }

  /* getters */
  getTransactions () {
    return this.transactions
  }

  getCapacity () {
    return this.capacity
  }

  getLength () {
    return this.transactions.length
  }

  pushTransaction (transaction) {
    if (this.totalReadsAndWrites > readWriteLimit) {
      this.tendTransactions()
      if (this.totalReadsAndWrites > readWriteLimit) {
        throw new RangeError('Maximum capacity for Multi-record transactions has been reached. Avoid setting readsCapacity and writesCapacity too high, and abort/commit open transactions so memory can be cleaned up and reused.')
      }
    } else {
      this.totalReadsAndWrites += (transaction.getReadsCapacity() + transaction.getWritesCapacity())
      this.transactions.push(transaction)
    }
  }

  resetTransactions () {
    this.transactions = []
  }

  increaseCapacity () {
    this.capacity *= 2
  }

  removeTransactions (indices) {
    for (const index of indices) {
      if (index >= 0 && index < this.transactions.length) {
        this.transactions.splice(index, 1)
      }
    }
  }

  removeAllTransactions () {
    for (const transaction of this.getTransactions()) {
      transaction.close()
    }
    this.resetTransactions()
  }

  /**
   * Algorithm used to cleanup memory from completed transactions.
   */
  tendTransactions () {
    if (this.getLength() > this.getCapacity()) {
      const indicesToDelete = []

      for (let i = 0; i < this.getLength(); i++) {
        const transaction = this.getTransactions()[i]
        const state = transaction.getState()
        if ((state === txnState.COMMITTED) || (state === txnState.ABORTED)) {
          transaction.close()
          indicesToDelete.unshift(i)
        }
      }

      this.removeTransactions(indicesToDelete)

      if (this.getLength() > this.getCapacity()) {
        this.increaseCapacity()
      }
    }
  }
}

module.exports = TransactionPool
