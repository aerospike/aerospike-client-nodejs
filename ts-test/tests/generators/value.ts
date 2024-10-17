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

// *****************************************************************************
// HELPERS
// ****************************************************************************
//
import Aerospike from 'aerospike';
const Double = Aerospike.Double


// Returns a random integer between min (included) and max (excluded)
function randomInt (min: number, max: number): number {
  return Math.floor(Math.random() * (max - min)) + min
}

// Returns a random number between min (included) and max (excluded)
function randomDouble (min: number, max: number): number {
  return Math.random() * (max - min) + min
}

function merge<T, U>(o1: T, o2: U): T & U {
  return { ...o1, ...o2 };
}


export function string (options?: any): () => string {
  const opt = merge(string.defaults, options)
  let seq: number = 0
  return function (): string {
    if (opt.random === true) {
      const lengthMin: number = opt.length.min || 1
      const lengthMax: number = opt.length.max || lengthMin
      const len: number = randomInt(lengthMin, lengthMax)
      const arr: Array<string> = new Array(len)
      for (let i = 0; i < len; i++) {
        arr[i] = opt.charset[randomInt(0, opt.charset.length)]
      }
      return opt.prefix + arr.join('') + opt.suffix
    } else {
      return opt.prefix + (seq++) + opt.suffix
    }
  }
}

string.defaults = {
  random: true,
  length: {
    min: 1,
    max: 128,
  },
  prefix: '',
  suffix: '',
  charset: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz',
}

export function bytes (options?: any): () => Buffer {
  const opt = merge(bytes.defaults, options)
  return function (): Buffer {
    const len: number = randomInt(opt.length.min, opt.length.max)
    const buf: Buffer = Buffer.alloc(len)
    for (let i = 0; i < len; i++) {
      buf[i] = randomInt(opt.byte.min, opt.byte.max)
    }
    return buf
  }
}

bytes.defaults = {
  length: {
    min: 1,
    max: 1024,
  },
  byte: {
    min: 0,
    max: 255,
  },
}



export function integer (options?: any): () => number {
  const opt  = merge(integer.defaults, options)
  let seq: number = opt.min
  return function (): number {
    return opt.random === true ? randomInt(opt.min, opt.max) : seq++
  }
}

integer.defaults = {
  random: true,
  min: 0,
  max: 0xffffff,
}

export function double (options?: any): () => typeof Double {
  const opt = merge(double.defaults, options)
  let seq: number = opt.min
  const step: number = opt.step
  const r: number = Math.pow(10, step.toString().length - step.toString().indexOf('.') - 1)
  return function (): any {
    if (opt.random){
      return new Double(randomDouble(opt.min, opt.max))
    } else {
      seq = Math.round(r * (seq + step)) / r
      return new Double(seq)
    }
  }
}

double.defaults = {
  random: true,
  min: 0,
  max: 0xffffff,
  step: 0.1,
}

export function array(options?: any): () => Array<any> {
  const opt = merge(array.defaults, options)
  return function (): Array<any> {
    return opt.values.map(function (gen: Function): any { return gen() })
  }
}

array.defaults = {
  values: [integer(), string(), bytes()]
}

export function map ():() => Object {
  return function (): Object {
    const num: Function = integer()
    const str: Function = string()
    const uint: Function = bytes()
    const map: Object = { itype: num(), stype: str(), btyte: uint() }
    return map
  }
}
// *****************************************************************************
// GENERATORS
// *****************************************************************************

export function constant<T>(value: T): () => T {
  return function(): T {
    return value;
  }
}
