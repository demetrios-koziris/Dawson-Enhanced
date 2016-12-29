# Dawson Enhanced
Browser Extension integrating teacher ratings and course seat availability into the Dawson Timetable and Registration Guide

<br>

## Building the extension using the `build.sh` script
####Usage:  
```
command [option] [parameter]... 
```
####Options:  
```
-c       Clean the /build directory before building  
```
####Parameters:  
```
chrome   Create a chrome extension in /build  
firefox  Create a firefox add-on in /build 
```
```
*If no parameters are passed, script will default to building the extension for every browser
```
####Examples:
```
./build.sh
./build.sh -c
./build.sh chrome  
./build.sh chrome firefox  
./build.sh -c chrome firefox  
```


<br>

<h2>
License
</h2>

Dawson Enhanced is a chrome extension that improves the functionality of the Dawson Timetable and Registration Guide. Copyright (C) 2016 Demetrios Koziris. Dawson College is a Cegep in Montreal, Quebec Canada and has no affiliation with this software.

This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License 
as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied 
warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

A copy of the GNU General Public License is provided in the LICENSE.txt file along with this program.  
The GNU General Public License can also be found at <https://www.gnu.org/licenses/gpl-3.0.html>.
