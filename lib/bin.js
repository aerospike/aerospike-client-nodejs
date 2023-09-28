// *****************************************************************************
// Copyright 2023 Aerospike, Inc.
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

/**
 * @class Bin
 * @classdesc Aerospike Bin
 *
 * In the Aerospike database, each record (similar to a row in a relational database) stores
 * data using one or more bins (like columns in a relational database). The major difference
 * between bins and RDBMS columns is that you don't need to define a schema. Each record can
 * have multiple bins. Bins accept the data types listed {@link  https://docs.aerospike.com/apidocs/nodejs/#toc4__anchor|here}.
 *
 * For information about these data types and how bins support them, see {@link https://docs.aerospike.com/server/guide/data-types/scalar-data-types|this}.
 *
 * Although the bin for a given record or object must be typed, bins in different rows do not
 * have to be the same type. There are some internal performance optimizations for single-bin namespaces.
 *
 * @summary Construct a new Aerospike Bin instance.
 *
 */
class Bin {
  /** @private */
  constructor (name, value, mapOrder) {
    /**
     * Bin name.
     *
     * @member {String} Bin#name
     */
    this.name = name

    /**
     * Bin value.
     *
     * @member {Any} Bin#value
     */
    if (mapOrder === 1) {
      this.value = new Map(Object.entries(value))
    } else {
      this.value = value
    }
  }
}

module.exports = Bin
