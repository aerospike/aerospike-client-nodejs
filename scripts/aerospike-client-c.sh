#! /bin/bash
################################################################################
# Copyright 2013-2014 Aerospike, Inc.
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

AEROSPIKE_C_VERSION=${AEROSPIKE_C_VERSION:-'4.0.3'}

################################################################################
#
# This script is used by bindings.gyp, to detect if libaerospike.a is
# installed and exporting the proper environment variables.
#
################################################################################

CWD=$(pwd)
AEROSPIKE=${CWD}/aerospike-client-c

unset PKG_DIST
unset PKG_TYPE
unset PKG_PATH

LUA_PATH=${AEROSPIKE_LUA_PATH}

################################################################################
#
# FUNCTIONS
#
################################################################################

detect_linux()
{
  # check to see if `lsb_release` is available.
  if [ ! -z "$(which lsb_release)" ]; then

    # We have LSB, so use it.
    DIST_IDEN=$(lsb_release -is | tr '[:upper:]' '[:lower:]')
    DIST_VERS=$(lsb_release -rs | cut -d. -f1 )
    DIST_NAME=${DIST_IDEN}${DIST_VERS}

    case ${DIST_NAME} in

      "centos6" | "redhatenterpriseserver6" | "centos7" | "fedora20" | "fedora21" | "fedora22")
        echo "el6" "rpm"
        return 0
        ;;

      "debian6" )
        echo "debian6" "deb"
        return 0
        ;;


      "debian7" | "debian8" )
        echo "debian7" "deb"
        return 0
        ;;

      "ubuntu12" | "ubuntu13" | "ubuntu14" | "ubuntu15" | "linuxmint17" )
        echo "ubuntu12"  "deb"
        return 0
        ;;

      * )
        echo "error: ${DIST_NAME} is not supported."
        return 1
        ;;

    esac
  fi

  # no LSB, check for /etc/centos-release
  if [ -f /etc/centos-release ]; then
    dist=$(cat /etc/redhat-release | tr '[:upper:]' '[:lower:]')
    case ${dist} in

      "centos"* | "red hat enterprise linux"* | "fedora"*)
	echo "el6" "rpm"
	return 0
	;;

       * )
	echo "error: ${dist} is not supported."
	return 1
	;;
     esac
   fi


  # Ok, no LSB, so check for /etc/issue
  if [ -f /etc/issue ]; then
    dist=$(cat /etc/issue | tr '[:upper:]' '[:lower:]')
    case ${dist} in

      "centos"* | "red hat enterprise linux"* | "fedora"* )
        echo "el6" "rpm"
        return 0
        ;;

      "debian"* )
        vers=$(cat /etc/debian_version)
        case ${vers} in
          "6."* )
            echo "debian6" "deb"
            return 0
            ;;

          "7."* | "8."* )
            echo "debian7" "deb"
            return 0
            ;;

          * )
            echo "error: Debian ${vers} is not supported."
            return 1
            ;;
        esac
        ;;

      "ubuntu"* )
        vers=$(lsb_release -r -s)
        case ${vers} in
          "12."* | "13."* | "14.*" )
            echo "ubuntu12"  "deb"
            return 0
            ;;

          * )
            echo "error: Ubuntu ${vers} is not supported."
            return 1
            ;;
        esac
        ;;

      "amazon linux"* )
        echo "el6" "rpm"
        return 0
        ;;

      * )
        echo "error: ${DIST_NAME} is not supported."
        return 1
        ;;

    esac
  fi

  echo "error: Linux Distro not supported"
  return 1
}

download()
{
  # create the package directory
  mkdir -p ${AEROSPIKE}/package

  # check to see if `curl` or `wget` is available.
  curl_path=`which curl`
  has_curl=$?

  # check for `wget`
  wget_path=`which wget`
  has_wget=$?

  # Check
  if [ $has_curl != 0 ] && [ $has_wget != 0 ]; then
    echo "error: Not able to find 'curl' or `wget`. Either is required to download the package."
    exit 1
  fi

  # Compose the URL for the client tgz
  URL="http://www.aerospike.com/download/client/c/${AEROSPIKE_C_VERSION}/artifact/${PKG_DIST}"

  # Download and extract the client tgz.
  # Use non-slient mode to show progress about the download. Important for slower networks.
  printf "info: downloading '${URL}' to '${AEROSPIKE}/package/aerospike-client-c.tgz'\n"

  if [ $has_curl == 0 ]; then
    curl -L ${URL} > ${AEROSPIKE}/package/aerospike-client-c.tgz
    if [ $? != 0 ]; then
      echo "error: Unable to download package from '${URL}'"
      exit 1
    fi
  elif [ $has_wget == 0 ]; then
    wget -O ${AEROSPIKE}/package/aerospike-client-c.tgz ${URL}
    if [ $? != 0 ]; then
      echo "error: Unable to download package from '${URL}'"
      exit 1
    fi
  fi

  return 0
}

################################################################################
# PREFIX is not defined, so we want to see if we can derive it.
################################################################################

if [ ! $DOWNLOAD ] && [ ! $PREFIX ]; then
  if [ -d ${AEROSPIKE} ] && [ -f ${AEROSPIKE}/package/usr/lib/libaerospike.a ] && [ -f ${AEROSPIKE}/package/usr/include/aerospike/aerospike.h ]; then
    # first, check to see if there is a local client
    PREFIX=${AEROSPIKE}/package/usr
    if [ -f ${AEROSPIKE}/package/opt/aerospike/client/sys/udf/lua/aerospike.lua ]; then
      LUA_PATH=${AEROSPIKE}/package/opt/aerospike/client/sys/udf/lua
    elif [ -f ${AEROSPIKE}/package/usr/local/aerospike/client/sys/udf/lua/aerospike.lua ]; then
      LUA_PATH=${AEROSPIKE}/package/usr/local/aerospike/client/sys/udf/lua
    fi
  elif [ -f /usr/lib/libaerospike.a ] && [ -f /usr/include/aerospike/aerospike.h ]; then
    # next, check to see if there is an installed client
    PREFIX=/usr
    if [ -f /opt/aerospike/client/sys/udf/lua/aerospike.lua ]; then
      LUA_PATH=/opt/aerospike/client/sys/udf/lua
    elif [ -f /usr/local/aerospike/client/sys/udf/lua/aerospike.lua ]; then
      LUA_PATH=/usr/local/aerospike/client/sys/udf/lua
    fi
  fi

  # If we can't find it, then download it.
  if [ ! $PREFIX ]; then
    DOWNLOAD=1
  fi
fi

if [ $DOWNLOAD ] && [ $DOWNLOAD == 1 ]; then

  ##############################################################################
  # DETECT OPERATING ENVIRONMENT
  ##############################################################################

  sysname=$(uname | tr '[:upper:]' '[:lower:]')

  case ${sysname} in

    ############################################################################
    # LINUX
    ############################################################################
    "linux" )
      result=$(detect_linux)
      if [ $? -ne 0 ]; then
        printf "$result\n" >&2
        exit 1
      fi

      IFS=" " read PKG_DIST PKG_TYPE <<< "${result}"
      PKG_PATH=${AEROSPIKE}/package/usr
      LUA_PATH=${AEROSPIKE}/package/opt/aerospike/client/sys/udf/lua
      ;;

    ############################################################################
    # MAC OS X
    ############################################################################
    "darwin" )
      PKG_DIST="mac"
      PKG_TYPE="pkg"
      PKG_PATH=${AEROSPIKE}/package/usr/local
      LUA_PATH=${AEROSPIKE}/package/usr/local/aerospike/client/sys/udf/lua
      ;;

    ############################################################################
    # OTHER
    ############################################################################
    * )
      printf "error: OS not supported\n" >&2
      exit 1
      ;;

  esac

  ##############################################################################
  # DOWNLOAD and extract the package, if it does not exist.
  # We will then move the files to the correct location for building.
  ##############################################################################

  if [ -d ${AEROSPIKE}/package/usr ]; then
    printf "warning: 'aerospike-client-c/package/usr' directory exists.\n"
    printf "warning: \n"
    printf "warning: We will be using this directory, rather than downloading a\n"
    printf "warning: new package. If you would like to download a new package\n"
    printf "warning: then please remove the 'aerospike-client' directory and any \n"
    printf "warning: 'aerospike-client.tgz' file in this directory.\n"
    printf "warning: \n"
  else

    ##############################################################################
    # DOWNLOAD TGZ
    ##############################################################################

    if [ -f ${AEROSPIKE}/package/aerospike-client-c.tgz ]; then
      printf "warning: 'aerospike-client-c/package/aerospike-client-c.tgz' file exists.\n"
      printf "warning: \n"
      printf "warning: We will be using this package, rather than downloading a new package.\n"
      printf "warning: If you would like to download a new package, then please remove.\n"
      printf "warning: 'aerospike-client.tgz' from this directory.\n"
      printf "warning: \n"
    else
      download

    fi

    ##############################################################################
    # EXTRACT DEVEL INSTALLER
    ##############################################################################

    # let's go into the directory
    cd ${AEROSPIKE}/package

    # Find the `devel` installer package in the client tgz
    INST_PATH=$(tar -tzf aerospike-client-c.tgz | grep -e ".*devel-.*\.${PKG_TYPE}")

    # Extract the `devel` installer package from the client tgz
    printf "info: extracting '${INST_PATH}' from 'aerospike-client-c.tgz'\n"
    tar -xzf aerospike-client-c.tgz --strip=1 ${INST_PATH}

    ##############################################################################
    # EXTRACT FILES FROM DEVEL INSTALLER
    ##############################################################################

    # Extract the contents of the `devel` installer package into `aerospike-client`
    case ${PKG_TYPE} in
      "rpm" )
        printf "info: extracting files from '${INST_PATH}'\n"
        rpm2cpio aerospike-client-c-devel-*.rpm | cpio -idm --no-absolute-filenames
        ;;
      "deb" )
        printf "info: extracting files from '${INST_PATH}'\n"
        dpkg -x aerospike-client-c-devel-*.deb .
        ;;
      "pkg" )
        printf "info: extracting files from '${INST_PATH}'\n"
        xar -xf aerospike-client-c-devel-*.pkg
        cat Payload | gunzip -dc | cpio -i
        rm Bom PackageInfo Payload
        ;;
    esac

    # let's return to parent directory
    cd ${CWD}

  fi

  PREFIX=${PKG_PATH}

fi

################################################################################
# PERFORM CHECKS
################################################################################

AEROSPIKE_LIBRARY=${PREFIX}/lib/libaerospike.a
AEROSPIKE_INCLUDE=${PREFIX}/include/aerospike
AEROSPIKE_LUA=${LUA_PATH}

printf "\n" >&1

printf "CHECK\n" >&1

if [ -f ${AEROSPIKE_LIBRARY} ]; then
  printf "   [✓] ${AEROSPIKE_LIBRARY}\n" >&1
else
  printf "   [✗] ${AEROSPIKE_LIBRARY}\n" >&1
  FAILED=1
fi

if [ -f ${AEROSPIKE_INCLUDE}/aerospike.h ]; then
  printf "   [✓] ${AEROSPIKE_INCLUDE}/aerospike.h\n" >&1
else
  printf "   [✗] ${AEROSPIKE_INCLUDE}/aerospike.h\n" >&1
  FAILED=1
fi

if [ -f ${AEROSPIKE_LUA}/aerospike.lua ]; then
  printf "   [✓] ${AEROSPIKE_LUA}/aerospike.lua\n" >&1
else
  printf "   [✗] ${AEROSPIKE_LUA}/aerospike.lua\n" >&1
  FAILED=1
fi

printf "\n" >&1

if [ $FAILED ]; then
  exit 1
fi

rm -rf ${AEROSPIKE}/lib
mkdir -p ${AEROSPIKE}/lib
cp ${PREFIX}/lib/libaerospike.a ${AEROSPIKE}/lib/.

rm -rf ${AEROSPIKE}/include
mkdir -p ${AEROSPIKE}/include
cp -R ${PREFIX}/include/* ${AEROSPIKE}/include

rm -rf ${AEROSPIKE}/lua
mkdir -p ${AEROSPIKE}/lua
cp -R ${AEROSPIKE_LUA}/* ${AEROSPIKE}/lua
