// *****************************************************************************
// Copyright 2013-2017 Aerospike, Inc.
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
 * Generic policy fields shared among all policies.
 */
class BasePolicy {
  constructor (props) {
    props = props || {}

    /**
     * Socket idle timeout in milliseconds when processing a database command.
     *
     * If socketTimeout is not zero and the socket has been idle for at least socketTimeout,
     * both maxRetries and totalTimeout are checked. If maxRetries and totalTimeout are not
     * exceeded, the transaction is retried.
     *
     * If both socketTimeout and totalTimeout are non-zero and socketTimeout > totalTimeout,
     * then socketTimeout will be set to totalTimeout.  If socketTimeout is zero, there will be
     * no socket idle limit.
     *
     * @type number
     * @default 0 (no socket idle time limit).
     */
    this.socketTimeout = props['socketTimeout']

    /**
     * Total transaction timeout in milliseconds.
     *
     * The totalTimeout is tracked on the client and sent to the server along with
     * the transaction in the wire protocol. The client will most likely timeout
     * first, but the server also has the capability to timeout the transaction.
     *
     * If totalTimeout is not zero and totalTimeout is reached before the transaction
     * completes, the transaction will return error AEROSPIKE_ERR_TIMEOUT.
     * If totalTimeout is zero, there will be no total time limit.
     *
     * @type number
     * @default 1000
     */
    this.totalTimeout = props['totalTimeout']

    /**
     * Maximum number of retries before aborting the current transaction.
     * The initial attempt is not counted as a retry.
     *
     * If max_retries is exceeded, the transaction will return error AEROSPIKE_ERR_TIMEOUT.
     *
     * WARNING: Database writes that are not idempotent (such as "add")
     * should not be retried because the write operation may be performed
     * multiple times if the client timed out previous transaction attempts.
     * It's important to use a distinct write policy for non-idempotent
     * writes which sets max_retries = 0;
     *
     * @type number
     * @default: 2 (initial attempt + 2 retries = 3 attempts)
     */
    this.maxRetries = props['maxRetries']
  }
}

module.exports = BasePolicy
