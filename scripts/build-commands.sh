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
AEROSPIKE_C_HOME=${CWD}/aerospike-client-c
OS_FLAVOR=linux
AEROSPIKE_NODEJS_RELEASE_HOME=${CWD}/lib/binding
LIBUV_VERSION=1.8.0
LIBUV_DIR=libuv-v${LIBUV_VERSION}
LIBUV_TAR=${LIBUV_DIR}.tar.gz
LIBUV_URL=http://dist.libuv.org/dist/v1.8.0/${LIBUV_TAR}
LIBUV_ABS_DIR=${CWD}/${LIBUV_DIR}
LIBUV_BUILD=0

if [[ "$OSTYPE" == "darwin"* ]]; then
  # Mac OSX
  AEROSPIKE_LIB_HOME=${AEROSPIKE_C_HOME}/target/Darwin-x86_64
  AEROSPIKE_LIBRARY=${AEROSPIKE_LIB_HOME}/lib/libaerospike.a
  AEROSPIKE_INCLUDE=${AEROSPIKE_LIB_HOME}/include

  LIBUV_DIR=/usr/local/opt/libuv
  LIBUV_ABS_DIR=${LIBUV_DIR}
  LIBUV_LIBRARY_DIR=${LIBUV_DIR}/lib
  LIBUV_INCLUDE_DIR=${LIBUV_DIR}/include
  LIBUV_LIBRARY=${LIBUV_LIBRARY_DIR}/libuv.a
  OS_FLAVOR=darwin
elif [[ "$OSTYPE" == "linux"* ]]; then
  AEROSPIKE_LIB_HOME=${AEROSPIKE_C_HOME}/target/Linux-x86_64
  AEROSPIKE_LIBRARY=${AEROSPIKE_LIB_HOME}/lib/libaerospike.a
  AEROSPIKE_INCLUDE=${AEROSPIKE_LIB_HOME}/include
  LIBUV_LIBRARY_DIR=${LIBUV_DIR}/.libs
  LIBUV_INCLUDE_DIR=${CWD}/${LIBUV_DIR}/include
  LIBUV_LIBRARY=${CWD}/${LIBUV_LIBRARY_DIR}/libuv.a
  OS_FLAVOR=linux
else
    # Unknown.
    printf "Unsupported OS version:" "$OSTYPE"
    exit 1
fi

configure_nvm() {
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
}

download_libuv() {
  if [[ "$OSTYPE" != "darwin"* ]]; then
    if [ ! -f ${LIBUV_TAR} ]; then
        echo Download ${LIBUV_URL}
        wget ${LIBUV_URL}
    fi

    if [ ! -d ${LIBUV_DIR} ]; then
        echo Extract ${LIBUV_TAR}
        tar xf ${LIBUV_TAR}
    fi
  fi
}

rebuild_libuv() {
  echo "rebuild_libuv"
  if [ $LIBUV_BUILD -eq 1 ]; then
    if [ ! -f ${LIBUV_LIBRARY} ]; then
        echo "Make ${LIBUV_ABS_DIR}"
        cd ${LIBUV_ABS_DIR}
        sh autogen.sh
        ./configure -q
        make clean
        make V=1 LIBUV_VERSIONBOSE=1 CFLAGS="-w -fPIC" 2>&1 | tee ${CWD}/${0}-libuv-output.log
        # make V=1 LIBUV_VERSIONBOSE=1 CFLAGS="-w -fPIC -DDEBUG" 2>&1 | tee ${CWD}/${0}-libuv-output.log
        # make V=1 LIBUV_VERSIONBOSE=1 install
        cd ..
    fi
  fi
}

check_libuv() {

  cd ${CWD}

  printf "\n" >&1

  if [ $LIBUV_BUILD -eq 1 ]; then
    if [ -f ${LIBUV_LIBRARY} ]; then
      printf "   [✓] %s\n" "${LIBUV_LIBRARY}" >&1
    else
      printf "   [✗] %s\n" "${LIBUV_LIBRARY}" >&1
      FAILED=1
    fi
  fi

  if [ -f ${LIBUV_INCLUDE_DIR}/uv.h ]; then
    printf "   [✓] %s\n" "${LIBUV_INCLUDE_DIR}/uv.h" >&1
  else
    printf "   [✗] %s\n" "${LIBUV_INCLUDE_DIR}/uv.h" >&1
    FAILED=1
  fi

  printf "\n" >&1

  if [ $FAILED ]; then
    exit 1
  fi
}

rebuild_c_client() {
  # if [ ! -f ${AEROSPIKE_LIBRARY} ]; then
    cd ${AEROSPIKE_C_HOME}
    make clean
    make V=1 VERBOSE=1 EVENT_LIB=libuv EXT_CFLAGS="-I${LIBUV_ABS_DIR}/include" 2>&1 | tee ${CWD}/${0}-cclient-output.log
    # make O=0 V=1 VERBOSE=1 EVENT_LIB=libuv EXT_CFLAGS="-I${LIBUV_ABS_DIR}/include -DDEBUG" 2>&1 | tee ${CWD}/${0}-output.log
  # fi
}

setup() {
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # # install xcode CLI
    # xcode-select —-install 
    # Check for Homebrew to be present, install if it's missing
    if test ! $(which brew); then
        echo "Installing homebrew..."
        ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"
    fi
    brew update
    PACKAGES=(
        openssl
    )
    echo "Installing packages..."
    brew install ${PACKAGES[@]}
    # link openssl
    unlink /usr/local/opt/openssl
    ln -s /usr/local/Cellar/openssl@3/*/ /usr/local/opt/openssl
    export LDFLAGS="-L/usr/local/opt/openssl@3/lib"
    export CPPFLAGS="-I/usr/local/opt/openssl@3/include"
  fi
}

check_aerospike() {

  cd ${CWD}
  
  printf "\n" >&1

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

perform_check() {

  cd ${CWD}

  printf "\n" >&1
  printf "CHECK\n" >&1

  check_libuv
  check_aerospike
}
