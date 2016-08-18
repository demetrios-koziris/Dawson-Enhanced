/*
RateMyDawson is a chrome extension that integrates RateMyTeachers ratings into the Dawson Registration Guide
Copyright (C) 2016 Demetrios Koziris

This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License 
as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied 
warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

A copy of the GNU General Public License is provided in the LICENSE.txt file along with this program.  
The GNU General Public License can also be found at <http://www.gnu.org/licenses/>.
*/

//jshint esversion: 6


function setupSeatsAvailability() {
	debugLog('Running: setupSeatsAvailability');
	seatsAvailabilityData = {};
}

function integrateSeatsAvailability() {
	debugLog('Running: integrateSeatsAvailability');
	debugLog(seatsAvailabilityData);

	getSeatsAvailability();
}


function getSeatsAvailability() {

    courseSeatsURL = 'https://myintranet.dawsoncollege.qc.ca/registration/course.seats.php'
    const xmlRequestInfo = {
        method: 'GET',
        action: 'xhttp',
        url: courseSeatsURL,
    };

    chrome.runtime.sendMessage(xmlRequestInfo, function(data) {
        try {
            if (data.responseXML == 'error') {
                debugLog(data);
            } 
            else {
            	const htmlParser = new DOMParser();
                const htmlDoc = htmlParser.parseFromString(data.responseXML, 'text/html');
                debugLog(htmlDoc);
            }
        } 
        catch(err) {
            debugLog('Error:\n' + err.stack);
        }
    });
}