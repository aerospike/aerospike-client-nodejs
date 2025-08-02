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
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.runInNewProcessFn = runInNewProcessFn;
var childProcess = require("child_process");
var tmp_1 = require("tmp");
var fs_1 = require("fs");
function generateTestSource(fn, data) {
    return "\n  'use strict'\n  const Aerospike = require(process.cwd())\n  const fn = ".concat(fn.toString(), "\n  const data = JSON.parse(`").concat(JSON.stringify(data), "`)\n  const report = (result) => new Promise((resolve) => process.send(result, resolve))\n\n  ;(async () => {\n    try {\n      const result = await fn(Aerospike, data)\n      await report({ result })\n    } catch (error) {\n      await report({ error })\n    }\n    process.exit()\n  })()\n");
}
function createTempFile(fn, data) {
    var source = generateTestSource(fn, data);
    var temp = tmp_1.default.fileSync({ postfix: '.js' });
    fs_1.default.writeSync(temp.fd, source);
    return temp.name;
}
function forkAndRun(fn, env, data) {
    var temp = createTempFile(fn, data);
    return childProcess.fork(temp, { env: env });
}
function runInNewProcessFn(fn, env, data) {
    return new Promise(function (resolve, reject) {
        var child = forkAndRun(fn, env, data);
        child.on('message', function (message) {
            child.disconnect();
            if (message.error) {
                reject(new Error(message.error));
            }
            else {
                resolve(message.result);
            }
        });
        child.on('error', function (error) {
            return console.error('Error for PID %s: %s', child.pid, error.message);
        });
    });
}
