
[ $SKIP_C_CLIENT ] && exit 0

OS=' '
# This script is yet to be tested on debian and ubuntu platforms

if [ -f /etc/redhat-release ]; then
	dist=`cat /etc/redhat-release | grep "CentOS"`
	echo $dist
	if [ ! -z "$dist" ]; then
		OS=el6
		echo $OS
	fi
elif [ -f /etc/debian_version ]; then
	dist=`lsb_release -a | grep Debian`
	if [ -z "$dist" ]; then
		dist=`cat /etc/*release* | grep Debian`
	fi
	if [ ! -z "$dist" ]; then
		OS=debian6  
	fi

elif [ -f /etc/lsb-release ]; then
	dist=`lsb_release -a | grep Ubuntu`
	if [ ! -z "$dist" ]; then
		OS=ubuntu12.04
	fi
else
	echo "OS not supported"
	exit 1
fi

url="http://www.aerospike.com/latest.php?package=client-c&os=$OS"
echo $url

#wget -O aerospike.tgz $url
#tar -xf aerospike.tgz

dir="aerospike-client-c*"
cd $dir

if [ "$OS" = "ubuntu12.04" ]; then
	dpkg -i aerospike-client-c-devel-*.ubuntu12.04x86_64.deb
elif [ "$OS" = "debian6" ]; then
	dpkg -i aerospike-client-c-devel-*.debian6x86_b4.deb
elif [ "$OS" = "el6" ]; then
	installed=`rpm -qa aerospike-client-c-devel`
	echo $installed
	if [ -z ${installed} ]; then
		rpm -i aerospike-client-c-devel-*.el6.x86_64.rpm
	else 
		rpm -Uvh aerospike-client-c-devel-*.el6.x86_64.rpm
	fi

else
	echo "OS not supported"
	exit 1;
fi

cd ..

NODE_PATH=/usr/lib/node_modules
export NODE_PATH
