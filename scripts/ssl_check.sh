#!/bin/bash

# Get the version string
raw=$(openssl version)

# Split the string on spaces
IFS=' ' read -ra arr <<< "$raw"

# Extract the first word from the array
libre=${arr[0]}

# Extract the version number from the second element of the array
version=${arr[1]}

# Split the version number on dots
IFS='.' read -ra arr <<< "$version"

# Extract the osn version number
osn=${arr[0]}

echo $osn;
if [[ ($osn == 3 && $libre != "LibreSSL") ]]; then
        cd lib/binding/openssl@3;
        for FILE in */; do rm -rf "../$FILE" && cp -r $FILE  "../$FILE"; done
        cd ../../..;
else
        cd lib/binding/openssl@1;
        for FILE in */; do rm -rf "../$FILE" && cp -r $FILE  "../$FILE"; done
        cd ../../..;
fi


