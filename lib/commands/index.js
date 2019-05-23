// *****************************************************************************
// Copyright 2013-2019 Aerospike, Inc.
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

module.exports = {
  Apply: class ApplyCommand extends Command('applyAsync') { },
  BatchExists: class BatchExistsCommand extends BatchCommand('batchExists') { },
  BatchGet: class BatchGetCommand extends BatchCommand('batchGet') { },
  BatchRead: class BatchReadCommand extends BatchCommand('batchRead') { },
  BatchSelect: class BatchSelectCommand extends BatchCommand('batchSelect') { },
  Connect: class ConnectCommand extends ConnectCommandBase('connect') { },
  Exists: class ExistsCommand extends ExistsCommandBase('existsAsync') { },
  Get: class GetCommand extends ReadRecordCommand('getAsync') { },
  IndexCreate: class IndexCreateCommand extends Command('indexCreate') { },
  IndexRemove: class IndexRemoveCommand extends Command('indexRemove') { },
  InfoAny: class InfoAnyCommand extends Command('infoAny') { },
  InfoForeach: class InfoForeachCommand extends Command('infoForeach') { },
  InfoHost: class InfoHostCommand extends Command('infoHost') { },
  InfoNode: class InfoNodeCommand extends Command('infoNode') { },
  JobInfo: class JobInfoCommand extends Command('jobInfo') { },
  Operate: class OperateCommand extends ReadRecordCommand('operateAsync') { },
  Put: class PutCommand extends WriteRecordCommand('putAsync') { },
  Query: class QueryCommand extends StreamCommand('queryAsync') { },
  QueryApply: class QueryApplyCommand extends Command('queryApply') { },
  QueryBackground: class QueryBackgroundCommand extends Command('queryBackground') { },
  QueryForeach: class QueryForeachCommand extends StreamCommand('queryForeach') { },
  Remove: class RemoveCommand extends WriteRecordCommand('removeAsync') { },
  Scan: class ScanCommand extends StreamCommand('scanAsync') { },
  ScanBackground: class ScanBackgroundCommand extends Command('scanBackground') { },
  Select: class SelectCommand extends ReadRecordCommand('selectAsync') { },
  Truncate: class TruncateCommand extends Command('truncate') { },
  UdfRegister: class UdfRegisterCommand extends Command('udfRegister') { },
  UdfRemove: class UdfRemoveCommand extends Command('udfRemove') { }
}
