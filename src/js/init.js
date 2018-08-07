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

let devMode = !('update_url' in chrome.runtime.getManifest());
let devLog = ( devMode ? console.log.bind(window.console) : function(){} );
devLog("DawsonEnhanced log mode is ON");

if (url.match(/.+timetable\.dawsoncollege.+/) && !(document.getElementById('user_login'))) {

	setupTeacherRatings();
	setupSeatsAvailability();
	mutationCount = 0;

	// select the target node
	let target = document.querySelector('#result-message');

	// create an observer instance
	let observer = new MutationObserver(function(mutations) {  
	  	mutations.forEach(function(mutation) {
            mutationCount++;

	  		if (mutationCount % 2 === 0) {
                devLog('mutation count: ' + mutationCount);
                
	  			integrateTeacherRatingsButtons();
	  			// integrateSeatsAvailability();
	  		}

	  	});    
	});

	// configuration of the observer:
	let config = { attributes: true, childList: false, characterData: true };

	// pass in the target node, as well as the observer options
	observer.observe(target, config);
}

if (url.match(/.+dawsoncollege\.omnivox\.ca\/intr\//)) {

	if (window.name === 'dawsonEnhancedFetchCourseSeats_1') {
	    omvivoxLinks = document.getElementsByClassName('lienMenuOmnivox');
	    courseAvailabilityLink = null;
	    for (let i = 0; i < omvivoxLinks.length; i++) {
	    	if (omvivoxLinks[i].innerText === 'Course Seats Available') {
	    		courseAvailabilityLink = omvivoxLinks[i];
	    	}
	    }
	    if (courseAvailabilityLink) {
		    caURL = 'https://dawsoncollege.omnivox.ca' + courseAvailabilityLink.href.match(/javascript\:OpenCentre\(\'([^\']+)/)[1];

		    window.name = 'dawsonEnhancedFetchCourseSeats_2';
		    window.open(caURL, "_self");
		}
		else {
			alert("Dawson Enhanced was not able to find the 'Course Seats Available' link. Please find and click this link to allow Dawson Enhanced to access the data before returning to the Timetable and Registration Guide.")
		}
	}
}

if (url.match(/.+myintranet\.dawsoncollege\.qc\.ca\/registration\/course\.seats\.php/)) {

	if (window.name === 'dawsonEnhancedFetchCourseSeats_2') {
	    window.name = 'dawsonEnhancedFetchCourseSeats_0';
	    window.open('https://timetable.dawsoncollege.qc.ca/', "_self");
	}
}