#!/bin/bash
################################################################################
# Copyright 2013-2022 Aerospike, Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
################################################################################


################################################################################
#
# This script is used to build dependancy c-client sub-module.
#
################################################################################

CWD=$(pwd)
SCRIPT_DIR=$(dirname $0)
BASE_DIR=$(cd "${SCRIPT_DIR}/.."; pwd)
SETUP=$1

. ${SCRIPT_DIR}/build-commands.sh

if [ -n "$1" ]; then setup
fi
download_libuv
rebuild_libuv
check_libuv

rebuild_c_client

perform_check

cd ${CWD}
