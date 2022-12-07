#!/bin/bash
raw=$(openssl version);
text=($raw);
libre=${text[0]};
osn=${text[1]::-1};
echo $osn;
echo $libre;
if [[ ($osn =~ 1*) || ($libre == "LibreSSL")]]; then
	cd lib/binding/openssl@1;
	for FILE in */; do rm -rf "../$FILE" && cp -r $FILE  "../$FILE"; done
else
	cd lib/binding/openssl@3;
	for FILE in */; do rm -rf "../$FILE" && cp -r $FILE  "../$FILE"; done
fi
cd ../../..;
./node_modules/.bin/node-pre-gyp install --fallback-to-build
