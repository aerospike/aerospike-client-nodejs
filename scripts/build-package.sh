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
# This script is used to build various node versions packages.
#
################################################################################

CWD=$(pwd)
SCRIPT_DIR=$(dirname $0)
BASE_DIR=$(cd "${SCRIPT_DIR}/.."; pwd)
AS_HOST="bob-cluster-a"
AS_USER="generic_client"
AS_PWD="generic_client"
AS_PORT="3000"
AS_NAMESPACE="ssd-store"

. ${SCRIPT_DIR}/build-commands.sh

build_nodejs_client() {
  rm -rf ./node_modules
  rm -f package-lock.json
  nvm install $1
  nvm use $1
  npm install --unsafe-perm --build-from-source
  # node ${CWD}/node_modules/.bin/mocha --exit --U ${AS_USER} --P ${AS_PWD} --h ${AS_HOST} --port ${AS_PORT} --namespace ${AS_NAMESPACE}
}

configure_nvm

if [ -n "$1" ]; then setup
fi
download_libuv
rebuild_libuv
check_libuv

rebuild_c_client

perform_check

rm -rf ${AEROSPIKE_NODEJS_RELEASE_HOME}/node-*-${OS_FLAVOR}-*

build_nodejs_client v10.20.0
build_nodejs_client v12.22.10
build_nodejs_client v14.19.0
build_nodejs_client v16.14.0
build_nodejs_client v17.8.0
build_nodejs_client v18.0.0

nvm use v18.0.0

cd ${CWD}
