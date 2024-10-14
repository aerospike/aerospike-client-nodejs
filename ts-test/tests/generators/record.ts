// *****************************************************************************
// Copyright 2013-2023 Aerospike, Inc.
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
import Aerospike, {ConfigOptions, Host, AerospikeBins} from 'aerospike';

//
// Returns a static record.
//
export function constant (bins: any): () => AerospikeBins {
  return function (): AerospikeBins  {
    return bins
  }
}

//
// Returns a record from bins spec'd using generators record.
//
export function record (bins: any): () => AerospikeBins {
  return function () {
    const out: AerospikeBins = {}
    for (const bin in bins) {
      out[bin] = bins[bin]()
    }
    return out
  }
}
