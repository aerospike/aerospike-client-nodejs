#!/bin/bash
raw=$(openssl version);
text=($raw);
libre=${text[0]};
osn=${text[1]};
if [[ ($osn =~ 3* && $libre != "LibreSSL") ]]; then
        cd lib/binding/openssl@3;
        for FILE in */; do rm -rf "../$FILE" && cp -r $FILE  "../$FILE"; done
        cd ../../..;
else
        cd lib/binding/openssl@1;
        for FILE in */; do rm -rf "../$FILE" && cp -r $FILE  "../$FILE"; done
        cd ../../..;
fi

