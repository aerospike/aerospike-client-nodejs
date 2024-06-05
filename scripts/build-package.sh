#!/bin/bash
################################################################################
# Copyright 2013-2023 Aerospike, Inc.
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

download_libuv
rebuild_libuv

rebuild_c_client

perform_check

rm -rf ${AEROSPIKE_NODEJS_RELEASE_HOME}/node-*-${OS_FLAVOR}-*


build_nodejs_client v18
build_nodejs_client v20
build_nodejs_client v21
build_nodejs_client v22

nvm use v22

cd ${CWD}
