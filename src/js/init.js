/*
Dawson Enhanced is a chrome extension that integrates teacher ratings and course seat availability into the Dawson Timetable and Registration Guide
Copyright (C) 2016 Demetrios Koziris

This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License 
as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied 
warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

A copy of the GNU General Public License is provided in the LICENSE.txt file along with this program.  
The GNU General Public License can also be found at <http://www.gnu.org/licenses/>.
*/

//jshint esversion: 6


const url = window.location.href;

window.debugMode = false;
debugLog('DawsonEnhanced Debug mode is ON');

debugLog('Running DawsonEnhanced');

if (url.match(/.+timetable\.dawsoncollege.+/) && !(document.getElementById('user_login'))) {

	setupTeacherRatings();
	mutationCount = 0;

	// select the target node
	let target = document.querySelector('#result-message');

	// create an observer instance
	let observer = new MutationObserver(function(mutations) {  
	  	mutations.forEach(function(mutation) {
            mutationCount++;

	  		if (mutationCount % 2 === 0) {
                debugLog('mutation count: ' + mutationCount);
	  			integrateTeacherRatingsButtons();
	  			
	  		}

	  	});    
	});

	// configuration of the observer:
	let config = { attributes: true, childList: false, characterData: true };

	// pass in the target node, as well as the observer options
	observer.observe(target, config);
}

function debugLog(message) {
    if (debugMode) {
        console.log(message);
    }
}