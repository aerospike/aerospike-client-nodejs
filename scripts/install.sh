OS=' '

if [ -f /etc/lsb-release ]; then
	OS=ubuntu12.04
elif [ -f /etc/debian_version ]; then
	OS=debian6  # XXX or Ubuntu??
elif [ -f /etc/redhat-release ]; then
	OS=el6
fi

url="http://www.aerospike.com/latest.php?package=client-c&os=$OS"
echo $url
wget -O aerospike.tgz $url

tar -xvf aerospike.tgz

dir="aerospike-client-c-*"
cd $dir

if [ "$OS" == "el6" ]; then
	sudo rpm -i aerospike-client-c-devel-*.el6.x86_64.rpm
elif [ "$OS" == "ubuntu12.04" ]; then
	sudo dpkg -i aerospike-client-c-devel-*.ubuntu12.04x86_64.deb
elif [ "$OS" == "debian6" ]; then
	sudo dpkg -i aerospike-client-c-devel-*.debian6x86_b4.deb
fi
cd ..
export NODE_PATH=/usr/lib/node_modules
echo $NODE_PATH
