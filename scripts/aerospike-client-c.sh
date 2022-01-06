#!/bin/bash
################################################################################
# Copyright 2013-2017 Aerospike, Inc.
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
INIFILE=${BASE_DIR}/aerospike-client-c.ini
CHECKSUMS=${BASE_DIR}/aerospike-client-c.sha256
AEROSPIKE=${CWD}/aerospike-client-c
LIB_PATH=${AEROSPIKE_C_LIB_PATH:-""}

# Version number of the Aerospike C Client package
AEROSPIKE_C_VERSION=5.1.0

# Use the package build with libuv support
AEROSPIKE_C_FLAVOR=libuv


################################################################################
#
# FUNCTIONS
#
################################################################################

has_cmd() {
  hash "$1" 2> /dev/null
}

################################################################################
# PERFORM CHECKS
################################################################################

AEROSPIKE_LIBRARY=${LIB_PATH}/lib/libaerospike.a
AEROSPIKE_INCLUDE=${LIB_PATH}/include

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
