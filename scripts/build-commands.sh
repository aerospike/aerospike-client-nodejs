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
# This script is used to build dependancy c-client sub-module.
#
################################################################################

CWD=$(pwd)
SCRIPT_DIR=$(dirname $0)
BASE_DIR=$(cd "${SCRIPT_DIR}/.."; pwd)
AEROSPIKE_C_HOME=${CWD}/aerospike-client-c
OS_FLAVOR=linux
AEROSPIKE_NODEJS_RELEASE_HOME=${CWD}/lib/binding
LIBUV_VERSION=1.45.0
LIBUV_DIR=libuv-v${LIBUV_VERSION}
LIBUV_TAR=${LIBUV_DIR}.tar.gz
LIBUV_URL=http://dist.libuv.org/dist/v1.45.0/${LIBUV_TAR}
LIBUV_ABS_DIR=${CWD}/${LIBUV_DIR}
LIBUV_BUILD=0
build_arch=$(uname -m)

if [[ "$OSTYPE" == "darwin"* ]]; then
  # Mac OSX
  AEROSPIKE_LIB_HOME=${AEROSPIKE_C_HOME}/target/Darwin-${build_arch}
  AEROSPIKE_LIBRARY=${AEROSPIKE_LIB_HOME}/lib/libaerospike.a
  AEROSPIKE_INCLUDE=${AEROSPIKE_LIB_HOME}/include

  # Node ships libuv. Compiling the C client against Homebrew libuv built for a
  # different CPU (Intel keg on Apple Silicon) ABI-mismatches Node and segfaults
  # in uv_async_init on connect(). Prefer Node's uv.h; use Homebrew only when
  # that library includes a slice for this host architecture.
  libuv_matches_host_arch() {
    local lib="$1"
    [ -f "$lib" ] || return 1
    local archs
    archs=$(lipo -archs "$lib" 2>/dev/null || true)
    [ -n "$archs" ] || return 1
    case " ${archs} " in
      *" ${build_arch} "*) return 0 ;;
    esac
    return 1
  }

  native_brew_libuv_include() {
    local prefix="$1"
    [ -n "$prefix" ] && [ -f "$prefix/include/uv.h" ] || return 1
    if libuv_matches_host_arch "$prefix/lib/libuv.dylib" || libuv_matches_host_arch "$prefix/lib/libuv.a"; then
      printf '%s\n' "$prefix/include"
      return 0
    fi
    echo "Skipping Homebrew libuv at ${prefix} (no ${build_arch} slice)" >&2
    return 1
  }

  NODE_UV_INCLUDE="$(node -p "require('path').join(require('path').dirname(process.execPath), '..', 'include', 'node')" 2>/dev/null || true)"
  BREW_LIBUV_INCLUDE=""
  if command -v brew >/dev/null 2>&1; then
    BREW_LIBUV_INCLUDE="$(native_brew_libuv_include "$(brew --prefix libuv 2>/dev/null || true)" || true)"
  fi
  if [ -f "${NODE_UV_INCLUDE}/uv.h" ]; then
    LIBUV_INCLUDE_DIR=${NODE_UV_INCLUDE}
  elif [ -n "${BREW_LIBUV_INCLUDE}" ]; then
    LIBUV_INCLUDE_DIR=${BREW_LIBUV_INCLUDE}
  elif [ -f /usr/local/opt/libuv/include/uv.h ] && { libuv_matches_host_arch /usr/local/opt/libuv/lib/libuv.dylib || libuv_matches_host_arch /usr/local/opt/libuv/lib/libuv.a; }; then
    LIBUV_INCLUDE_DIR=/usr/local/opt/libuv/include
  else
    echo "ERROR: no ${build_arch} libuv headers (Node include/node or native-arch Homebrew libuv)" >&2
    exit 1
  fi
  LIBUV_DIR=$(dirname "${LIBUV_INCLUDE_DIR}")
  LIBUV_ABS_DIR=${LIBUV_DIR}
  LIBUV_LIBRARY_DIR=${LIBUV_DIR}/lib
  LIBUV_LIBRARY=${LIBUV_LIBRARY_DIR}/libuv.a
  OS_FLAVOR=darwin
elif [[ "$OSTYPE" == "linux"* ]]; then
  AEROSPIKE_LIB_HOME=${AEROSPIKE_C_HOME}/target/Linux-${build_arch}
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

rebuild_c_client() {
  # if [ ! -f ${AEROSPIKE_LIBRARY} ]; then
    cd ${AEROSPIKE_C_HOME}
    make clean
    make V=1 VERBOSE=1 EVENT_LIB=libuv EXT_CFLAGS="-I${LIBUV_INCLUDE_DIR}" 2>&1 | tee ${CWD}/${0}-cclient-output.log
    # make O=0 V=1 VERBOSE=1 EVENT_LIB=libuv EXT_CFLAGS="-I${LIBUV_ABS_DIR}/include -DDEBUG" 2>&1 | tee ${CWD}/${0}-output.log
  # fi
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

  check_aerospike
}
