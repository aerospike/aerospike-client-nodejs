AEROSPIKE=.

PKG_DIST=mac

mkdir -p ${AEROSPIKE}/package

# Compose the URL for the client tgz
URL="http://www.aerospike.com/latest.php?package=client-c&os=${PKG_DIST}"

# Download and extract the client tgz
printf "info: fetching '${URL}'"
location=$(curl -Is "${URL}" | grep Location)
if [ $? != 0 ]; then
  printf "error: Unable to download package from '${URL}'\n" >&2
  exit 1
fi

if [ ${PKG_DIST} == 'mac' ]; then
  location=${location/.x86_64/}
fi

# Download and extract the client tgz
printf "info: downloading '${URL}' to '${AEROSPIKE}/package/aerospike-client-c.tgz'\n"
curl -Ls ${location} > ${AEROSPIKE}/package/aerospike-client-c.tgz
if [ $? != 0 ]; then
  printf "error: Unable to download package from '${URL}'\n" >&2
  exit 1
fi

# let's go into the directory
cd ${AEROSPIKE}/package

# Find the `devel` installer package in the client tgz
INST_PATH=$(tar -tzf aerospike-client-c.tgz | grep -e ".*devel-.*\.${PKG_TYPE}")

# Extract the `devel` installer package from the client tgz
printf "info: extracting '${INST_PATH}' from 'aerospike-client-c.tgz'\n"
tar -xzf aerospike-client-c.tgz --strip=1 ${INST_PATH}


xar -xf aerospike-client-c-devel-*.pkg
cat Payload | gunzip -dc |cpio -i
rm Bom PackageInfo Payload
