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
# This script is used by bindings.gyp, to detect if libaerospike.a is
# installed and exporting the proper environment variables.
#
################################################################################

CWD=$(pwd)
SCRIPT_DIR=$(dirname $0)
BASE_DIR=$(cd "${SCRIPT_DIR}/.."; pwd)
AEROSPIKE_C_HOME=${CWD}/aerospike-client-c
perform_check() {
  cd ${CWD}
  scripts/validate-c-client.sh
}

install_libuv() {
  cd ${AEROSPIKE_C_HOME}
  ./install_libuv
}

rebuild_c_client() {
  cd ${AEROSPIKE_C_HOME}
  make clean
  make EVENT_LIB=libuv 2>&1 | tee ${CWD}/${0}-output.txt
  # make O=0 V=1 EVENT_LIB=libuv EXT_CFLAGS=-DDEBUG 2>&1 | tee ${CWD}/${0}-output.txt  
}

install_libuv
rebuild_c_client
perform_check

cd ${CWD}
