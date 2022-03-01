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

if [ -f ~/.nvm/nvm.sh ]; then
  echo 'sourcing nvm from ~/.nvm'
  . ~/.nvm/nvm.sh
elif command -v brew; then
  # https://docs.brew.sh/Manpage#--prefix-formula
  BREW_PREFIX=$(brew --prefix nvm)
  if [ -f "$BREW_PREFIX/nvm.sh" ]; then
    echo "sourcing nvm from brew ($BREW_PREFIX)"
    . $BREW_PREFIX/nvm.sh
  fi
fi

if command -v nvm ; then
  echo "SUCCESS: nvm is configured"
else
  echo "WARN: not able to configure nvm"
  exit 1
fi

build_c_client() {
  cd ${CWD}
  scripts/build-c-client.sh
  cd ${CWD}
}

build_nodejs_client() {
  rm -rf ./node_modules
  rm -f package-lock.json
  nvm install $1
  nvm use $1
  npm install --unsafe-perm --build-from-source
}

install_nodejs

build_c_client

build_nodejs_client v10.20.0
build_nodejs_client v12.22.10
build_nodejs_client v14.19.0
build_nodejs_client v16.14.0

nvm use v16.14.0

cd ${CWD}
