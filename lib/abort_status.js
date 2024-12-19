// *****************************************************************************
// Copyright 2024 Aerospike, Inc.
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

'use strict'

const as = require('bindings')('aerospike.node')
const abortStatus = as.abortStatus

module.exports = {
  OK: abortStatus.OK,
  ALREADY_COMMITTED: abortStatus.ALREADY_COMMITTED,
  ALREADY_ABORTED: abortStatus.ALREADY_ABORTED,
  ROLL_BACK_ABANDONED: abortStatus.MARK_ROLL_FORWARD_ABANDONED,
  CLOSE_ABANDONED: abortStatus.CLOSE_ABANDONED
}
