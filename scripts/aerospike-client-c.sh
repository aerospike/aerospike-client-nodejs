#! /bin/bash
################################################################################
#
# This script is used by bindings.gyp, to detect if libaerospike.a is
# installed and exporting the proper environment variables.
#
################################################################################


CWD=$(pwd)
AEROSPIKE=${CWD}/aerospike-client-c

################################################################################
# PREFIX is not defined, so we want to see if we can derive it.
################################################################################
if [ ! $DOWNLOAD ] && [ ! $PREFIX ]; then
  if [ -d ${AEROSPIKE} ] && [ -f ${AEROSPIKE}/package/usr/lib/libaerospike.a ] && [ -f ${AEROSPIKE}/package/usr/include/aerospike/aerospike.h ]; then
    # first, check to see if there is a local client
    PREFIX=${AEROSPIKE}/package/usr
  elif [ -f /usr/lib/libaerospike.a ] && [ -f /usr/include/aerospike/aerospike.h ]; then
    # next, check to see if there is an installed client
    PREFIX=/usr
  fi

  # If we can't find it, then download it.
  if [ ! $PREFIX ]; then
    DOWNLOAD=1
  fi
fi

if [ $DOWNLOAD ] && [ $DOWNLOAD == 1 ]; then

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
    # DETECT OPERATING ENVIRONMENT
    ##############################################################################

    # check to see if `lsb_release` is available.
    lsb_path=`which lsb_release`

    # get the OS name and version
    if [ ! -z ${lsb_path} ]; then

      # We have LSB, so use it.
      DIST_IDEN=$(lsb_release -is | tr '[:upper:]' '[:lower:]')
      DIST_VERS=$(lsb_release -rs | cut -d. -f1 )
      DIST_NAME=${DIST_IDEN}${DIST_VERS}

      case ${DIST_NAME} in
        "centos6" | "redhatenterpriceserver6" )
          PKG_DIST="el6"
          PKG_TYPE="rpm"
          ;;
        "debian6" )
          PKG_DIST=${DIST_NAME}
          PKG_TYPE="deb"
          ;;
        "ubuntu12" )
          PKG_DIST="ubuntu12.04"
          PKG_TYPE="deb"
          ;;
        * )
          printf "error: ${DIST_NAME} is not supported.\n" >&2
          exit 1
          ;;
      esac

    elif [ -f /etc/redhat-release ]; then
      # Ok, no LSB, so check if it is a Redhat based distro
      dist=$(cat /etc/redhat-release | grep "CentOS")
      if [ ! -z "$dist" ]; then
        PKG_DIST="el6"
        PKG_TYPE="rpm"
      fi

    elif [ -f /etc/system-release ]; then
      # Check for Amazon Linux
      dist=$(cat /etc/system-release | grep "Amazon Linux")
      if [ ! -z "$dist" ]; then
        PKG_DIST="el6"
        PKG_TYPE="rpm"
      fi

    else
      printf "error: OS not supported\n" >&2
      exit 1
    fi

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

      # create the package directory
      mkdir -p ${AEROSPIKE}/package

      # check to see if `curl` is available.
      curl_path=`which curl`
      has_curl=$?

      if [ $has_curl != 0 ]; then
        printf "error: 'curl' not found. This is required to download the package.\n" >&2
        exit 1
      fi

      # Compose the URL for the client tgz
      URL="http://www.aerospike.com/latest.php?package=client-c&os=${PKG_DIST}"

      # Download and extract the client tgz
      printf "info: downloading '${URL}' to '${AEROSPIKE}/package/aerospike-client-c.tgz'\n"
      curl -Ls ${URL} > ${AEROSPIKE}/package/aerospike-client-c.tgz
      if [ $? != 0 ]; then
        printf "error: Unable to download package from '${URL}'\n" >&2
        exit 1
      fi

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
        cd ..
        ;;
      "deb" )
        printf "info: extracting files from '${INST_PATH}'\n"
        dpkg -x aerospike-client-c-devel-*.deb .
        ;;
    esac

    # let's return to parent directory
    cd ${CWD}

  fi

  ##############################################################################
  # Set PREFIX Variable
  ##############################################################################

  PREFIX=${AEROSPIKE}/package/usr

fi

################################################################################
# PERFORM CHECKS
################################################################################

AEROSPIKE_LIBRARY=${PREFIX}/lib/libaerospike.a
AEROSPIKE_INCLUDE=${PREFIX}/include/aerospike

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

printf "\n" >&1

if [ $FAILED ]; then

  printf "error: It appears as though one or more files cannot be found.\n" >&1
  printf "error: \n" >&1
  printf "error: You can either:\n" >&1
  printf "error: \n" >&1
  printf "error:    a. Re-run with 'DOWNLOAD=1'\n" >&1
  printf "error:    \n" >&1
  printf "error:       $ DOWNLOAD=1 npm install\n" >&1
  printf "error: \n" >&1
  printf "error:    b. Set the 'PREFIX' variable to the path containing the files\n" >&1
  printf "error:    \n" >&1
  printf "error:       $ PREFIX=/usr npm install\n" >&1
  printf "error: \n" >&1
  printf "error:    c. Download and install the the Aerospike C Client development package,\n" >&1
  printf "error:       then retry the command.\n" >&1
  printf "error: \n" >&1

  exit 1
fi

rm -rf ${AEROSPIKE}/lib
mkdir -p ${AEROSPIKE}/lib
cp ${PREFIX}/lib/libaerospike.a ${AEROSPIKE}/lib/.

rm -rf ${AEROSPIKE}/include
mkdir -p ${AEROSPIKE}/include
cp -R ${PREFIX}/include ${AEROSPIKE}

