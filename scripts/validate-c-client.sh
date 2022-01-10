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

if [[ "$OSTYPE" == "linux-gnu"* ]]; then
  AEROSPIKE_LIB_HOME=${AEROSPIKE_C_HOME}/target/Linux-x86_64
  AEROSPIKE_LIBRARY=${AEROSPIKE_LIB_HOME}/lib/libaerospike.a
  AEROSPIKE_INCLUDE=${AEROSPIKE_LIB_HOME}/include
elif [[ "$OSTYPE" == "darwin"* ]]; then
        # Mac OSX
  AEROSPIKE_LIB_HOME=${AEROSPIKE_C_HOME}/target/Darwin-x86_64
  AEROSPIKE_LIBRARY=${AEROSPIKE_LIB_HOME}/lib/libaerospike.a
  AEROSPIKE_INCLUDE=${AEROSPIKE_LIB_HOME}/include
else
    # Unknown.
    printf "Unsupported OS version:" "$OSTYPE"
    exit 1
fi

################################################################################
# PERFORM CHECKS
################################################################################
perform_check() {

  cd ${CWD}

  printf "\n" >&1
  printf "CHECK\n" >&1

  if [ -f ${AEROSPIKE_LIBRARY} ]; then
    printf "   [✓] %s\n" "${AEROSPIKE_LIBRARY}" >&1
  else
    printf "   [✗] %s\n" "${AEROSPIKE_LIBRARY}" >&1
    FAILED=1
  fi

  if [ -f ${AEROSPIKE_INCLUDE}/aerospike/aerospike.h ]; then
    printf "   [✓] %s\n" "${AEROSPIKE_INCLUDE}/aerospike/aerospike.h" >&1
  else
    printf "   [✗] %s\n" "${AEROSPIKE_INCLUDE}/aerospike/aerospike.h" >&1
    FAILED=1
  fi

  printf "\n" >&1

  if [ $FAILED ]; then
    exit 1
  fi
}

perform_check
