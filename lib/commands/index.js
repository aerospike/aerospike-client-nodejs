// *****************************************************************************
// Copyright 2013-2020 Aerospike, Inc.
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

const BatchCommand = require('./batch_command')
const Command = require('./command')
const ConnectCommandBase = require('./connect_command')
const ExistsCommandBase = require('./exists_command')
const ReadRecordCommand = require('./read_record_command')
const StreamCommand = require('./stream_command')
const WriteRecordCommand = require('./write_record_command')
const QueryBackgroundBaseCommand = require('./query_background_command')

exports.Apply = class ApplyCommand extends Command('applyAsync') { }
exports.BatchExists = class BatchExistsCommand extends BatchCommand('batchExists') { }
exports.BatchGet = class BatchGetCommand extends BatchCommand('batchGet') { }
exports.BatchRead = class BatchReadCommand extends BatchCommand('batchRead') { }
exports.BatchWrite = class BatchWriteCommand extends BatchCommand('batchWrite') { }
exports.BatchApply = class BatchApplyCommand extends BatchCommand('batchApply') { }
exports.BatchRemove = class BatchRemoveCommand extends BatchCommand('batchRemove') { }
exports.BatchSelect = class BatchSelectCommand extends BatchCommand('batchSelect') { }
exports.Connect = class ConnectCommand extends ConnectCommandBase('connect') { }
exports.Exists = class ExistsCommand extends ExistsCommandBase('existsAsync') { }
exports.Get = class GetCommand extends ReadRecordCommand('getAsync') { }
exports.IndexCreate = class IndexCreateCommand extends Command('indexCreate') { }
exports.IndexRemove = class IndexRemoveCommand extends Command('indexRemove') { }
exports.InfoAny = class InfoAnyCommand extends Command('infoAny') { }
exports.InfoForeach = class InfoForeachCommand extends Command('infoForeach') { }
exports.InfoHost = class InfoHostCommand extends Command('infoHost') { }
exports.InfoNode = class InfoNodeCommand extends Command('infoNode') { }
exports.JobInfo = class JobInfoCommand extends Command('jobInfo') { }
exports.Operate = class OperateCommand extends ReadRecordCommand('operateAsync') { }
exports.Put = class PutCommand extends WriteRecordCommand('putAsync') { }
exports.Query = class QueryCommand extends StreamCommand('queryAsync') { }
exports.QueryApply = class QueryApplyCommand extends Command('queryApply') { }
exports.QueryBackground = class QueryBackgroundCommand extends QueryBackgroundBaseCommand('queryBackground') { }
exports.QueryOperate = class QueryOperateCommand extends QueryBackgroundBaseCommand('queryBackground') { }
exports.QueryForeach = class QueryForeachCommand extends StreamCommand('queryForeach') { }
exports.Remove = class RemoveCommand extends WriteRecordCommand('removeAsync') { }
exports.Scan = class ScanCommand extends StreamCommand('scanAsync') { }
exports.ScanBackground = class ScanBackgroundCommand extends QueryBackgroundBaseCommand('scanBackground') { }
exports.ScanOperate = class ScanOperateCommand extends QueryBackgroundBaseCommand('scanBackground') { }
exports.Select = class SelectCommand extends ReadRecordCommand('selectAsync') { }
exports.Truncate = class TruncateCommand extends Command('truncate') { }
exports.UdfRegister = class UdfRegisterCommand extends Command('udfRegister') { }
exports.UdfRemove = class UdfRemoveCommand extends Command('udfRemove') { }
