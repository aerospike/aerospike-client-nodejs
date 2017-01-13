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
LIB_PATH=${PREFIX}
LUA_PATH=${AEROSPIKE_LUA_PATH}

DOWNLOAD=${DOWNLOAD:=0}
COPY_FILES=1
DOWNLOAD_DIR=${AEROSPIKE}/package

unset PKG_TYPE PKG_VERSION PKG_SUFFIX PKG_ARTIFACT

source ${INIFILE}


################################################################################
#
# FUNCTIONS
#
################################################################################

has_cmd() {
  hash "$1" 2> /dev/null
}

verify_checksum() {
  artifact=$1
  dir=$2
  checksums=$3
  binary=${dir}/${artifact}
  expected=$(grep ${artifact} ${checksums} | cut -d" " -f1)

  if has_cmd sha256sum; then
    actual=$(sha256sum $binary | cut -d" " -f1)
  elif has_cmd openssl; then
    actual=$(openssl dgst -sha256 $binary | cut -d" " -f2)
  else
    echo "error: Not able to verify download. Either 'sha256sum' or 'openssl' are required."
    exit 1
  fi

  if [ $actual = $expected ]; then
    printf "info: verifying checksum for '%s': OK\n" "${artifact}"
  else
    printf "error: invalid checksum for '%s'\n" "${artifact}"
    exit 1
  fi

  return 0
}

download() {
  artifact=$1
  version=$2
  dest_dir=$3
  dest="${dest_dir}/${artifact}"

  mkdir -p ${dest_dir}

  url="https://artifacts.aerospike.com/aerospike-client-c/${version}/${artifact}"
  printf "info: downloading '%s' to '%s'\n" "${url}" "${dest}"

  if has_cmd curl; then
    curl -L ${url} > ${dest}
    if [ $? != 0 ]; then
      echo "error: Unable to download package from '${url}'"
      exit 1
    fi
  elif has_cmd wget; then
    wget -O ${dest} ${url}
    if [ $? != 0 ]; then
      echo "error: Unable to download package from '${url}'"
      exit 1
    fi
  else
    echo "error: Not able to find 'curl' or 'wget'. Either is required to download the package."
    exit 1
  fi

  return 0
}

function check_lib_path() {
  [ -d "$1" ] && [ -f "$1/lib/libaerospike.a" ] && [ -f "$1/include/aerospike/aerospike.h" ]
}

function check_lua_path() {
  [ -d "$1" ] && [ -f "$1/aerospike.lua" ]
}

################################################################################
# LIB_PATH is not defined, so we want to see if we can derive it.
################################################################################

if [ $DOWNLOAD == 0 ] && [ -z $LIB_PATH ]; then
  # first, check to see if there is a local client
  if check_lib_path ${AEROSPIKE}; then
    LIB_PATH=${AEROSPIKE}
    if check_lua_path ${AEROSPIKE}/lua; then
      LUA_PATH=${AEROSPIKE}/lua
    fi
    COPY_FILES=0
  # next, check to see if there is an installed client
  elif check_lib_path "/user"; then
    LIB_PATH=/usr
    if check_lua_path /opt/aerospike/client/sys/udf/lua; then
      LUA_PATH=/opt/aerospike/client/sys/udf/lua
    elif check_lua_path /usr/local/aerospike/client/sys/udf/lua; then
      LUA_PATH=/usr/local/aerospike/client/sys/udf/lua
    fi
  fi

  # If we can't find it, then download it.
  if [ ! $LIB_PATH ]; then
    DOWNLOAD=1
  fi
fi

if [ $DOWNLOAD ] && [ $DOWNLOAD == 1 ]; then

  ##############################################################################
  # DETECT OPERATING ENVIRONMENT
  ##############################################################################

  PKG_VERSION=${AEROSPIKE_C_VERSION}
  PKG_BUILD="${AEROSPIKE_C_FLAVOR:+-$AEROSPIKE_C_FLAVOR}-devel"

  sysname=$(uname | tr '[:upper:]' '[:lower:]')

  case ${sysname} in

    ############################################################################
    # LINUX
    ############################################################################
    "linux" )
      PKG_DIST=$($SCRIPT_DIR/os_version)
      if [ $? -ne 0 ]; then
        printf "%s\n" "$PKG_DIST" >&2
        exit 1
      fi

      case $PKG_DIST in
        "el"* )
          PKG_VERSION="${AEROSPIKE_C_VERSION//-/_}-1"
          PKG_SUFFIX="${PKG_DIST}.x86_64.rpm"
          PKG_TYPE="rpm"
          ;;
        "debian"* )
          PKG_SUFFIX="${PKG_DIST}.x86_64.deb"
          PKG_TYPE="deb"
          ;;
        "ubuntu12" )
          PKG_SUFFIX="ubuntu12.04.x86_64.deb"
          PKG_TYPE="deb"
          ;;
        "ubuntu14" )
          PKG_SUFFIX="ubuntu14.04.x86_64.deb"
          PKG_TYPE="deb"
          ;;
        "ubuntu"* )
          PKG_SUFFIX="ubuntu16.04.x86_64.deb"
          PKG_TYPE="deb"
          ;;
        "ami"* )
          PKG_VERSION="${AEROSPIKE_C_VERSION//-/_}-1"
          PKG_SUFFIX="el6.x86_64.rpm"
          PKG_TYPE="rpm"
          ;;
        * )
          printf "error: Linux distribution not supported: '%s'\n" "$PKG_DIST" >&2
          exit 1
          ;;
      esac

      PKG_ARTIFACT="aerospike-client-c${PKG_BUILD}-${PKG_VERSION}.${PKG_SUFFIX}"

      LIB_PATH=${AEROSPIKE}/package/usr
      LUA_PATH=${AEROSPIKE}/package/opt/aerospike/client/sys/udf/lua
      ;;

    ############################################################################
    # MAC OS X
    ############################################################################
    "darwin" )
      PKG_ARTIFACT="aerospike-client-c${PKG_BUILD}-${PKG_VERSION}.pkg"
      PKG_TYPE="pkg"
      LIB_PATH=${AEROSPIKE}/package/usr/local
      LUA_PATH=${AEROSPIKE}/package/usr/local/aerospike/client/sys/udf/lua
      ;;

    ############################################################################
    # OTHER
    ############################################################################
    * )
      printf "error: OS not supported: '%s'\n" "${sysname}" >&2
      exit 1
      ;;

  esac

  ##############################################################################
  # DOWNLOAD and extract the package, if it does not exist.
  # We will then move the files to the correct location for building.
  ##############################################################################

  if check_lib_path ${AEROSPIKE}; then
    printf "warning: '%s' directory exists.\n" "${AEROSPIKE}"
    printf "warning: \n"
    printf "warning: We will be using this directory, rather than downloading a\n"
    printf "warning: new package. If you would like to download a new package\n"
    printf "warning: please remove the '%s' directory.\n" $(basename ${AEROSPIKE})
  else

    ##############################################################################
    # DOWNLOAD TGZ
    ##############################################################################

    if [ -f ${AEROSPIKE}/package/${PKG_ARTIFACT} ]; then
      printf "warning: '%s' file exists.\n" "${AEROSPIKE}/package/${PKG_ARTIFACT}"
      printf "warning: \n"
      printf "warning: We will be using this package, rather than downloading a new package.\n"
      printf "warning: If you would like to download a new package please remove\n"
      printf "warning: the package file.\n"
    else
      download ${PKG_ARTIFACT} ${AEROSPIKE_C_VERSION} ${DOWNLOAD_DIR}
      verify_checksum ${PKG_ARTIFACT} ${DOWNLOAD_DIR} ${CHECKSUMS}
    fi

    ##############################################################################
    # EXTRACT FILES FROM DEVEL INSTALLER
    ##############################################################################

    # let's go into the directory
    cd ${AEROSPIKE}/package

    # Extract the contents of the `devel` installer package into `aerospike-client`
    printf "info: extracting files from '%s'\n" ${PKG_ARTIFACT}
    case ${PKG_TYPE} in
      "rpm" )
        rpm2cpio ${PKG_ARTIFACT} | cpio -idmu --no-absolute-filenames --quiet
        ;;
      "deb" )
        dpkg -x ${PKG_ARTIFACT} .
        ;;
      "pkg" )
        xar -xf ${PKG_ARTIFACT} Payload
        cpio -idmu -I Payload --quiet
        rm Payload
        ;;
    esac

    # let's return to parent directory
    cd ${CWD}

  fi

fi

################################################################################
# PERFORM CHECKS
################################################################################

AEROSPIKE_LIBRARY=${LIB_PATH}/lib/libaerospike.a
AEROSPIKE_INCLUDE=${LIB_PATH}/include
AEROSPIKE_LUA=${LUA_PATH}

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

if [ -f ${AEROSPIKE_LUA}/aerospike.lua ]; then
  printf "   [✓] %s\n" "${AEROSPIKE_LUA}/aerospike.lua" >&1
else
  printf "   [✗] %s\n" "${AEROSPIKE_LUA}/aerospike.lua" >&1
  FAILED=1
fi

printf "\n" >&1

if [ $FAILED ]; then
  exit 1
fi

################################################################################
# COPY FILES TO AEROSPIKE-C-CLIENT DIR
################################################################################

if [ $COPY_FILES == 1 ]; then
  rm -rf ${AEROSPIKE}/{lib,include,lua}
  mkdir -p ${AEROSPIKE}/{lib,include,lua}
  cp ${AEROSPIKE_LIBRARY} ${AEROSPIKE}/lib/
  cp -R ${AEROSPIKE_INCLUDE}/{aerospike,citrusleaf} ${AEROSPIKE}/include/
  cp ${AEROSPIKE_LUA}/*.lua ${AEROSPIKE}/lua/
fi
