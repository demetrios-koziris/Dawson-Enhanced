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


function setupTeacherRatings() {
    debugLog('Running: setupTeacherRatings');
    teacherRatings = {};
    teacherData = {};
    failedMessage = 'Ratings data failed to load. Please click Search to reload.';
    ratingsURL = 'http://ca.ratemyteachers.com';
    insertRatingsFetcher();
}

function insertRatingsFetcher() {
    //inject script.js into page
    var s = document.createElement('script');
    s.src = chrome.extension.getURL('js/insertedRatingsFetcher.js');
    (document.head || document.documentElement).appendChild(s);
    console.log('inserted');
}


function generateTeacherNameObject(origName) {
    const name = origName.trim();
    const splitName = name.split(' ');
    const profName = {
        fullNameKey: name.replace(/\W/g, ''),
        fullName: name,
        firstName: splitName[0],
        lastName: splitName[splitName.length-1]
    };
    return profName;
}

function integrateTeacherRatingsButtons() {
    debugLog('Running: integrateTeacherRatings');
    debugLog(teacherRatings);
    teacherData = {};

    courses = document.getElementsByClassName('section-details');
    if (courses.length > 0) {
        
        for (let i = 0; i < courses.length; i++) {

            rows = courses[i].getElementsByTagName('li');
            for (let r = 0; r < rows.length; r++) {
                rowLabel = rows[r].firstElementChild.innerText;
                if (rowLabel.match('Teacher')) {

                    teachers = rows[r].children[1].innerText.split(',');
                    for (let t = 0; t < teachers.length; t++) {
                        teacherName = teachers[t].trim();
                        teacherNameObj = generateTeacherNameObject(teacherName);
                        teacherKey = teacherNameObj.fullNameKey;

                        if (!teacherKey.match(/\d+/g)) {

                            ratingsRow = createRatingsRow(teacherKey);
                            
                            courses[i].insertBefore(ratingsRow, rows[r+1]);
                            ratingsElement = ratingsRow.children[1];

                            if (teacherData[teacherKey]) {
                                teacherData[teacherKey].elements.push(ratingsElement);
                            }
                            else {
                                teacherData[teacherKey] = {
                                    nameObj: teacherNameObj, 
                                    elements: [ratingsElement] 
                                };
                            }
                            
                        }
                    }
                }
                else if (rowLabel.match('Drop Date')) {
                    // rename row label to Drop Date instead of Course Drop Date so it takes only 1 line
                    rows[r].firstElementChild.innerText = 'Drop Date';
                    break;
                }
            }
        }

        document.addEventListener("register", function(data) {
            console.log(data.target.activeElement.value);
        });
    }
}

function createRatingsRow(teacherKey) {

    const ratingsRow = document.createElement('li');
    ratingsRow.className = 'row';

    const ratingsLabel = document.createElement('label');
    ratingsLabel.className = 'col-md-2';
    ratingsLabel.innerText = 'Ratings';
    ratingsRow.append(ratingsLabel);

    const ratingsDiv = document.createElement('div');
    ratingsDiv.className = 'col-md-10';
    ratingsRow.append(ratingsDiv);

    const ratingsButton = document.createElement('button');
    ratingsButton.setAttribute('type', 'button');
    ratingsButton.setAttribute("onclick", register.toString() +  " register();");
    ratingsButton.className = 'btn btn-sm btn-default';
    ratingsButton.innerText = 'Get Ratings';
    ratingsButton.value = teacherKey;
    ratingsDiv.append(ratingsButton);

    return ratingsRow;
}

function register() {
    var event = document.createEvent('Event');
    event = new Event('register');
    document.dispatchEvent(event);
}
