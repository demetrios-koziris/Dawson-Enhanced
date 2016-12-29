#!/bin/bash

#  Usage: 
#    command [option] <parameter>...
#
#  Options:
#    -c       Clean the /build directory before building
#  Parameters:
#    chrome   Create a chrome extension in /build
#    firefox  Create a firefox add-on in /build 
#    *If no parameters are passed, script will default to building the extension for every browser
#
#  Examples :
#    ./build.sh 
#    ./build.sh -c
#    ./build.sh chrome
#    ./build.sh chrome firefox
#    ./build.sh -c chrome firefox


# handle -c (clean) option flag
while getopts "c" opt; do
  case $opt in
    c)
      echo "$0: Option -clean was triggered"
      echo "$0: Cleaning /build directory"
      rm -r build
      mkdir -p build
      set -- ${@:2}
      ;;
  esac
done

# if no arguments passed, default to building all browser versions of extension
if [ $# -lt 1 ] ; then
  echo
  echo "$0: Building all browser extensions since no arguments specifying browsers received"
  set -- "firefox" "chrome"
fi

# build extension for each browser specified in arguments (builds all if no browser specified)
for browser in "$@"; do

	echo 

	if [ $browser != firefox ] && [ $browser != chrome ]; then
		echo "$0: Invalid argument: $browser"
		echo "$0: Browser argument specified must be firefox or chrome"
		continue
	fi 

	today=`date '+%Y_%m_%d__%H_%M_%S'`;
	buildname="DawsonEnhanced__"$today"__"$browser
	echo "$0: Creating $browser version in build/$buildname"
	mkdir -p build

	# build firefox add-on
	if [ $browser == firefox ]; then

		match='"author": "kozdev",'
		insert='  "applications":{"gecko":{"id":"extension@example.org"}},'
		file='src/manifest.json'
		sed -i "s/$match/$match\n$insert/" $file

		cd src
		zip -rq ../build/$buildname.xpi icons js lib menu manifest.json
		cd ..

		sed -i '/"gecko"/d' $file   

	fi

	# build chrome extension
	if [ $browser == chrome ]; then

		cd src
		zip -rq ../build/$buildname.zip icons js lib menu manifest.json
		cd ..

	fi

done