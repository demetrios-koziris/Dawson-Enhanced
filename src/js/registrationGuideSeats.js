/*
RateMyDawson is a chrome extension that integrates teacher ratings and course seat availability into the Dawson Timetable and Registration Guide
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
    getSeatsAvailability();
}

function integrateSeatsAvailability() {
	debugLog('Running: integrateSeatsAvailability');
	debugLog(seatsAvailabilityData);

    
    coursesWraps = document.getElementsByClassName('course-wrap');
    coursesNumbers = document.getElementsByClassName('cnumber');

    if (coursesWraps.length > 0) {
        
        for (let i= 0; i < coursesWraps.length; i++) {
            const courseNumber = coursesNumbers[i].innerText;
            const rows = coursesWraps[i].getElementsByTagName('li');
            for (let r = 0; r < rows.length; r++) {

                rowLabel = rows[r].firstElementChild.innerText;
                if (rowLabel.match('Section Title')) {
                    rows[r].firstElementChild.innerText = 'Title';
                }
                else if (rowLabel.match('Section')) {
                    const sectionVal = rows[r].children[1];
                    const section = parseInt(sectionVal.innerText.trim());

                    if (courseNumber in seatsAvailabilityData) {
                        if (section in seatsAvailabilityData[courseNumber]) {
                            sectionVal.innerHTML += "  (" + seatsAvailabilityData[courseNumber][section] + " Seats Available)";
                        }
                    }
                }
            }
        }
    }
}


function getSeatsAvailability() {

    courseSeatsURL = 'https://myintranet.dawsoncollege.qc.ca/registration/course.seats.php';
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

                const rowElems = htmlDoc.getElementsByClassName('t');
                for (let r = 0; r < rowElems.length; r+=4) {
                    const courses = rowElems[r].innerText.split('\n');
                    const seats = rowElems[r+1].innerText;
                    for (let c = 1; c < courses.length; c++) {
                        const courseIdentifier = courses[c].trim().split(/\s{4}/);
                        const courseName = courseIdentifier[0];
                        const courseSection = courseIdentifier[1];
                        if (!(courseName in seatsAvailabilityData)) {
                            seatsAvailabilityData[courseName] = {};
                        }
                        seatsAvailabilityData[courseName][parseInt(courseSection)] = seats;
                    }
                }
                debugLog(seatsAvailabilityData);
            }
        } 
        catch(err) {
            debugLog('Error:\n' + err.stack);
        }
    });
}
