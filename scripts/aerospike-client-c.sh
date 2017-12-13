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

DOWNLOAD=${DOWNLOAD:=0}
COPY_FILES=1
DOWNLOAD_DIR=${AEROSPIKE}/package

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
  checksums=$2
  echo grep ${artifact} ${checksums}
  expected=$(grep ${artifact} ${checksums} | cut -d" " -f1)

  if has_cmd sha256sum; then
    actual=$(sha256sum $artifact | cut -d" " -f1)
  elif has_cmd openssl; then
    actual=$(openssl dgst -sha256 $artifact | cut -d" " -f2)
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

  url="https://artifacts.aerospike.com/aerospike-client-c/${version}/${artifact}"
  printf "info: downloading '%s' to '%s'\n" "${url}" "${artifact}"

  if has_cmd curl; then
    curl -L ${url} > ${artifact}
    if [ $? != 0 ]; then
      echo "error: Unable to download package from '${url}'"
      exit 1
    fi
  elif has_cmd wget; then
    wget -O ${artifact} ${url}
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


################################################################################
# LIB_PATH is not defined, so we want to see if we can derive it.
################################################################################

if [ $DOWNLOAD == 0 ] && [ -z $LIB_PATH ]; then
  # first, check to see if there is a local client
  if check_lib_path ${AEROSPIKE}; then
    LIB_PATH=${AEROSPIKE}
    COPY_FILES=0
  # next, check to see if there is an installed client
  elif check_lib_path "/usr"; then
    LIB_PATH=/usr
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

  BASE="aerospike-client-c"
  FLAVOR="${AEROSPIKE_C_FLAVOR:+-$AEROSPIKE_C_FLAVOR}"
  BUILD="-devel"
  VERSION=${AEROSPIKE_C_VERSION}
  PLATFORM="x86_64"
  FORMAT="tgz"
  PKG_VERSION=${AEROSPIKE_C_VERSION}

  sysname=$(uname | tr '[:upper:]' '[:lower:]')

  case ${sysname} in

    ############################################################################
    # LINUX
    ############################################################################
    "linux" )
      DISTRO=$($SCRIPT_DIR/os_version)
      if [ $? -ne 0 ]; then
        printf "%s\n" "$DISTRO" >&2
        exit 1
      fi

      case $DISTRO in
        "el"* )
          PKG_VERSION="${AEROSPIKE_C_VERSION//-/_}-1"
          PKG_FORMAT="rpm"
          ;;
        "debian"* )
          PKG_FORMAT="deb"
          ;;
        "ubuntu12" )
          DISTRO="ubuntu12.04"
          PKG_FORMAT="deb"
          ;;
        "ubuntu14" )
          DISTRO="ubuntu14.04"
          PKG_FORMAT="deb"
          ;;
        "ubuntu"* )
          DISTRO="ubuntu16.04"
          PKG_FORMAT="deb"
          ;;
        "ami"* )
          DISTRO="el6"
          PKG_VERSION="${AEROSPIKE_C_VERSION//-/_}-1"
          PKG_FORMAT="rpm"
          ;;
        * )
          printf "error: Linux distribution not supported: '%s'\n" "$DISTRO" >&2
          exit 1
          ;;
      esac

      ARTIFACT="${BASE}${FLAVOR}-${AEROSPIKE_C_VERSION}.${DISTRO}.${PLATFORM}.${FORMAT}"
      PACKAGE="${BASE}${FLAVOR}${BUILD}-${PKG_VERSION}.${DISTRO}.${PLATFORM}.${PKG_FORMAT}"
      LIB_PATH=${AEROSPIKE}/package/usr
      ;;

    ############################################################################
    # MAC OS X
    ############################################################################
    "darwin" )
      DISTRO="mac"
      PKG_FORMAT="pkg"

      ARTIFACT="${BASE}${FLAVOR}-${AEROSPIKE_C_VERSION}.${DISTRO}.${PLATFORM}.${FORMAT}"
      PACKAGE="${BASE}${FLAVOR}${BUILD}-${PKG_VERSION}.${PKG_FORMAT}"
      LIB_PATH=${AEROSPIKE}/package/usr/local
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
    # DOWNLOAD CLIENT ARTIFACT & EXTRACT DEVEL PACAKGE
    ##############################################################################

    mkdir -p ${DOWNLOAD_DIR}
    cd ${DOWNLOAD_DIR}

    if [ -f ${PACKAGE} ]; then
      printf "warning: '%s' file exists.\n" "${DOWNLOAD_DIR}/${PACKAGE}"
      printf "warning: \n"
      printf "warning: We will be using this package, rather than downloading a new package.\n"
      printf "warning: If you would like to download a new package please remove\n"
      printf "warning: the package file.\n"
    else
      if [ -f ${ARTIFACT} ]; then
        printf "warning: '%s' file exists.\n" "${DOWNLOAD_DIR}/${ARTIFACT}"
        printf "warning: \n"
        printf "warning: We will be using this package, rather than downloading a new package.\n"
        printf "warning: If you would like to download a new package please remove\n"
        printf "warning: the package file.\n"
      else
        download ${ARTIFACT} ${AEROSPIKE_C_VERSION} ${DOWNLOAD_DIR}
        verify_checksum ${ARTIFACT} ${CHECKSUMS}
      fi

      printf "info: extracting devel package from '%s'\n" ${ARTIFACT}
      PKG_PATH=${ARTIFACT%.${FORMAT}}/${PACKAGE}
      tar -xz --strip-components=1 -f ${ARTIFACT} ${PKG_PATH}
    fi

    ##############################################################################
    # EXTRACT FILES FROM DEVEL INSTALLER
    ##############################################################################

    # Extract the contents of the `devel` installer package into `aerospike-client`
    printf "info: extracting files from '%s'\n" ${PACKAGE}
    case ${PKG_FORMAT} in
      "rpm" )
        rpm2cpio ${PACKAGE} | cpio -idmu --no-absolute-filenames --quiet
        ;;
      "deb" )
        dpkg -x ${PACKAGE} .
        ;;
      "pkg" )
        xar -xf ${PACKAGE} Payload
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

################################################################################
# COPY FILES TO AEROSPIKE-C-CLIENT DIR
################################################################################

if [ $COPY_FILES == 1 ]; then
  rm -rf ${AEROSPIKE}/{lib,include}
  mkdir -p ${AEROSPIKE}/{lib,include}
  cp ${AEROSPIKE_LIBRARY} ${AEROSPIKE}/lib/
  cp -R ${AEROSPIKE_INCLUDE}/{aerospike,citrusleaf} ${AEROSPIKE}/include/
fi
