#!/bin/bash
raw=$(openssl version);
text=($raw);
libre=${text[0]};
osn=${text[1]::-1};
echo $osn;
echo $libre;
archType=$(uname -m)
echo $archType
if [[ ($osn =~ 1*) || ($libre == "LibreSSL")]]; then
        cd lib/binding/openssl@1;
        for FILE in */; do rm -rf "../$FILE" && cp -r $FILE  "../$FILE"; done
        cd ../../..;
else
        cd lib/binding/openssl@3;
        for FILE in */; do rm -rf "../$FILE" && cp -r $FILE  "../$FILE"; done
        cd ../../..;
fi
if [[ ($archType == "aarch64")]]; then
        ./node_modules/.bin/node-pre-gyp install --fallback-to-build target_arch=aarch64
else
        ./node_modules/.bin/node-pre-gyp install --fallback-to-build
fi

