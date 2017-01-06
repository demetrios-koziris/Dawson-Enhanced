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
    teacherSearchElements = {};
    insertFetchRatingsEventListener();
    failedMessage = 'Ratings data failed to load. Please click Search to reload.';
    ratingsURL = 'http://ca.ratemyteachers.com';
}

function insertFetchRatingsEventListener() {
    document.addEventListener("fetchRatings", function(data) {
        const teacherKey = data.target.activeElement.value;
        console.log(teacherKey);
        setLoadingGif(teacherKey);

        if (teacherRatings[teacherKey]) {
            savedRatings = teacherRatings[teacherKey];
            if (savedRatings.code === 1) {
                debugLog(teacherKey);
                updateTeacherElementsWithRating(savedRatings.nameObj, savedRatings.URL, savedRatings.content);
            }
            else if (savedRatings.code > -1) {
                updateTeacherElementsWithMessage(savedRatings.nameObj, savedRatings.URL, savedRatings.content);
            }
        }
        else {
            teacherRatings[teacherKey] = {code: -1, nameObj: null, URL: null, content: null };
            getTeacherURL(teacherSearchElements[teacherKey].nameObj, true);
        }
    });
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
    teacherSearchElements = {};

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

                            if (teacherSearchElements[teacherKey]) {
                                teacherSearchElements[teacherKey].elements.push(ratingsElement);
                            }
                            else {
                                teacherSearchElements[teacherKey] = {
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
    }
}

function setLoadingGif(teacherKey) {
    teacherDivs = teacherSearchElements[teacherKey].elements;
    for (let i = 0; i < teacherDivs.length; i++) {
        currTeacherDiv = teacherDivs[i];
        removeChildren(currTeacherDiv);

        const loadingImg = document.createElement('img');
        loadingImg.src = 'https://timetable.dawsoncollege.qc.ca/wp-content/plugins/timetable//assets/images/ajax-loader.gif';
        loadingImg.style.display = 'inline';
        currTeacherDiv.appendChild(loadingImg);
    }
}

function getTeacherURL(teacherNameObj, fullNameSearch) {

    let ratingsContent = '';
    let teacherSearchURL = ratingsURL + '/dawson-college/38432-s?q=';
    if (fullNameSearch) {
        teacherSearchURL += teacherNameObj.firstName + '+';
    }
    teacherSearchURL += teacherNameObj.lastName;

    const xmlRequestInfo = {
        method: 'GET',
        action: 'xhttp',
        url: teacherSearchURL,
    };

    chrome.runtime.sendMessage(xmlRequestInfo, function(data) {
        try {
            if (data.responseXML == 'error') {
                debugLog(data);
                updateSavedTeacherRatings(teacherNameObj, teacherURL, failedMessage, -1);
                updateTeacherElementsWithMessage(teacherNameObj, teacherSearchURL, failedMessage);
            } 
            else {
                
                let teacherURL = data.url;
                const htmlParser = new DOMParser();
                const htmlDoc = htmlParser.parseFromString(data.responseXML, 'text/html');
                const searchResults = htmlDoc.getElementsByClassName('teacher_name');

                if (searchResults.length === 0) { 
                    if (fullNameSearch) {
                        // 0 teacher result from fullNameSearch search so try search with just last name
                        // debugLog(teacherNameObj.fullName + ': (zero) ' + teacherURL);
                        getTeacherURL(teacherNameObj, false);
                    }
                    else {
                        // 0 teacher result from search using just last name
                        debugLog(teacherNameObj.fullName + ': (zero) ' + teacherURL);
                        getTeacherContent(teacherNameObj, teacherURL, 0);
                    }
                } 
                else if (searchResults.length == 1) { 
                    // 1 teacher result so create url with result
                    teacherURL = ratingsURL + searchResults[0].children[0].getAttribute('href');
                    debugLog(teacherNameObj.fullName + ': ' + teacherURL);
                    getTeacherContent(teacherNameObj, teacherURL, 1);
                } 
                else {
                    //multiple profs so search for exact or close match
                    let teacherFound = false;                    
                    for (let i = 0; i < searchResults.length; i++) {
                        const resultName = searchResults[i].children[0].getAttribute('href').split('/')[1].replace(/\-/g, ' ');
                        const resultFirstName = resultName.split(' ')[1].trim(' ');
                        const nameMatches = (getEditDistance(resultFirstName.toLowerCase(), teacherNameObj.firstName.toLowerCase())<=2 || 
                                             resultName.toLowerCase().match(teacherNameObj.firstName.toLowerCase()) || 
                                             teacherNameObj.firstName.toLowerCase().match(resultFirstName.toLowerCase()));
                        if (nameMatches){
                            teacherFound = true;
                            teacherURL = ratingsURL + searchResults[0].children[0].getAttribute('href');
                        }
                        break;
                    }
                    if (teacherFound) {
                        debugLog(teacherNameObj.fullName + ': ' + teacherURL);
                        getTeacherContent(teacherNameObj, teacherURL, 1);
                    }
                    else {
                        debugLog(teacherNameObj.fullName + ': (mult) ' + teacherURL);
                        getTeacherContent(teacherNameObj, teacherURL, 2);
                    }                        
                }
            }
        } 
        catch(err) {
            debugLog('Error: ' + teacherNameObj.fullName + '\n' + err.stack);
            updateSavedTeacherRatings(teacherNameObj, teacherURL, failedMessage, -1);
            updateTeacherElementsWithMessage(teacherNameObj, teacherSearchURL, failedMessage);
        }
    });
}

function getTeacherContent(teacherNameObj, teacherURL, resultCode) {

    const xmlRequestInfo = {
        method: 'GET',
        action: 'xhttp',
        url: teacherURL,
    };
    let ratingsContent = '';

    chrome.runtime.sendMessage(xmlRequestInfo, function(data) {
        try {

            if (data.responseXML == 'error') {
                debugLog(data);
                updateSavedTeacherRatings(teacherNameObj, teacherURL, failedMessage, -1);
                updateTeacherElementsWithMessage(teacherNameObj, teacherURL, failedMessage);
            } 
            else {
                let teacherURL = data.url;

                const htmlParser = new DOMParser();
                const htmlDoc = htmlParser.parseFromString(data.responseXML, 'text/html');

                const rating = {
                    summary: 'ERROR',
                    fullName: 'ERROR',
                    overall: 'ERROR',
                    easiness: 'ERROR',
                    helpfulness: 'ERROR',
                    clarity: 'ERROR',
                    knowledge: 'ERROR',
                    textbookUse: 'ERROR',
                    examDifficulty: 'ERROR',
                    numOfRatings: 'ERROR'
                };
                
                if (resultCode === 0) {
                    ratingsContent = 'Teacher ' + teacherNameObj.fullName + ' not found. Please click to search RMT.';
                    updateSavedTeacherRatings(teacherNameObj, teacherURL, ratingsContent, 0);
                    updateTeacherElementsWithMessage(teacherNameObj, teacherURL, ratingsContent);

                } 
                else if (resultCode == 2) {
                    ratingsContent = 'Multiple teachers found for ' + teacherNameObj.fullName + '. Please click to see results.';
                    updateSavedTeacherRatings(teacherNameObj, teacherURL, ratingsContent, 2);
                    updateTeacherElementsWithMessage(teacherNameObj, teacherURL, ratingsContent);

                } 
                else if (resultCode == 1) {
                    
                    if (htmlDoc.getElementsByClassName('rating-summary').length < 2) {
                        //See Vincenzo Lentini: vince-lentini/6135115-t
                        ratingsContent = 'Teacher ' + teacherNameObj.fullName + ' has no ratings. Please click to be the first to rate.';
                        updateSavedTeacherRatings(teacherNameObj, teacherURL, ratingsContent, 0);
                        updateTeacherElementsWithMessage(teacherNameObj, teacherURL, ratingsContent);
                    } 
                    else {
                        
                        ratingElem = htmlDoc.getElementsByClassName('rating-summary')[0];
                        if (ratingElem) {
                            ratingSummary = ratingElem.innerText.split('\n');
                            rating.overall = ratingSummary[2];
                            rating.numOfRatings = ratingSummary[4];
                            // rating.summary = ratingElem.innerText.replace(/\n/g, ' ');
                        }
                        rating.fullName = parseRatingData(htmlDoc, 'teacher_name');
                        rating.easiness = parseRatingData(htmlDoc, 'easy');
                        rating.helpfulness = parseRatingData(htmlDoc, 'helpful');
                        rating.clarity = parseRatingData(htmlDoc, 'clarity');
                        rating.knowledge = parseRatingData(htmlDoc, 'knowledgeable');
                        rating.textbookUse = parseRatingData(htmlDoc, 'textbook_use');
                        rating.examDifficulty = parseRatingData(htmlDoc, 'exam_difficulty');

                        updateSavedTeacherRatings(teacherNameObj, teacherURL, rating, 1);
                        updateTeacherElementsWithRating(teacherNameObj, teacherURL, rating);
                    }
                }                
            }
        } 
        catch(err) {
            debugLog('Error: ' + teacherNameObj.fullName + '\n' + err.stack);
            updateSavedTeacherRatings(teacherNameObj, teacherURL, failedMessage, -1);
            updateTeacherElementsWithMessage(teacherNameObj, teacherURL, failedMessage);
        }
    });
}

function parseRatingData(htmlDoc, className) {
    ratingElem = htmlDoc.getElementsByClassName(className)[0];
    return (ratingElem ? ratingElem.innerText.trim() : '_');
}

function updateTeacherElementsWithRating(teacherNameObj, teacherURL, rating) {
    if (teacherSearchElements[teacherNameObj.fullNameKey]) {
        const teacherElements = teacherSearchElements[teacherNameObj.fullNameKey].elements;
        for (let p = 0; p < teacherElements.length; p++) {
            teacherElements[p].className += ' schedule';
            teacherElements[p].style = '';
            removeChildren(teacherElements[p]);
            teacherElements[p].appendChild(generateRatingsContentElem(teacherURL, rating));
        }
    }
}

function updateTeacherElementsWithMessage(teacherNameObj, teacherURL, message) {
    if (teacherSearchElements[teacherNameObj.fullNameKey]) {
        const teacherElements = teacherSearchElements[teacherNameObj.fullNameKey].elements;
        for (let p = 0; p < teacherElements.length; p++) {
            teacherElements[p].style = '';
            removeChildren(teacherElements[p]);
            teacherElements[p].appendChild(generateNewTabLink(teacherURL, message));
        }
    }
}

function updateSavedTeacherRatings(teacherNameObj, teacherURL, content, code) {
    if (code === -1) {
        debugLog('DELETE ' + teacherNameObj.fullName);
        delete teacherRatings[teacherNameObj.fullNameKey];
    }
    else {
        ratingData = {
            code: code,
            nameObj: teacherNameObj,
            URL: teacherURL,
            content: content
        };
        teacherRatings[teacherNameObj.fullNameKey] = ratingData;
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
    ratingsDiv.style.paddingTop = '6px';
    ratingsRow.append(ratingsDiv);

    const ratingsButton = document.createElement('button');
    ratingsButton.setAttribute('type', 'button');
    ratingsButton.setAttribute("onclick", fetchRatings.toString() +  " fetchRatings();");
    ratingsButton.className = 'btn btn-sm btn-default';
    ratingsButton.innerText = 'Get Ratings';
    ratingsButton.title = 'Click to load ratings for this teacher.'
    ratingsButton.value = teacherKey;
    ratingsDiv.append(ratingsButton);

    return ratingsRow;
}

function fetchRatings() {
    var event = document.createEvent('Event');
    event = new Event('fetchRatings');
    document.dispatchEvent(event);
}

function removeChildren(parent) {
    while (parent.firstChild) {
        parent.removeChild(parent.firstChild);
    }
}

function generateNewTabLink(url, message) {
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.innerHTML = message;
    return link;
}

function generateRatingsContentElem(teacherURL, rating) {

    const ratingsDiv = document.createElement('div');
    ratingsDiv.class = 'ratings-summary';
    ratingsDiv.style = 'line-height: 1.6';

    ratingsLinkMessage = rating.fullName + ': <b>' + rating.overall + '</b> average based on ' + rating.numOfRatings + ' professor rating' + (rating.numOfRatings > 1 ? 's.' : '.');
    const ratingsLink = generateNewTabLink(teacherURL, ratingsLinkMessage);
    ratingsDiv.appendChild(ratingsLink);

    const ratingsTable = document.createElement('table');
    ratingsTable.class = 'ratings-table';
    ratingsTable.style.tableLayout = 'fixed';
    ratingsTable.style.lineHeight = '1';
    ratingsDiv.appendChild(ratingsTable);

    const ratingsDataTbody = document.createElement('tbody');
    ratingsTable.appendChild(ratingsDataTbody);

    const ratingsDataRow = document.createElement('tr');
    ratingsDataTbody.appendChild(ratingsDataRow);

    ratingDataKeys = ['easiness', 'helpfulness', 'clarity', 'knowledge', 'textbookUse', 'examDifficulty'];
    for (let i = 0; i < ratingDataKeys.length; i++) {
        const ratingsDataTd = document.createElement('td');
        ratingsDataTd.style.textAlign = 'center';
        ratingsDataTd.style.border = 'solid #d9d9d9';
        ratingsDataTd.style.borderWidth = '0px 1px';
        ratingsDataTd.innerText = rating[ratingDataKeys[i]];
        ratingsDataRow.appendChild(ratingsDataTd);
    }

    const ratingsLabelTbody = document.createElement('tbody');
    ratingsTable.appendChild(ratingsLabelTbody);

    const ratingsLabelRow = document.createElement('tr');
    ratingsLabelTbody.appendChild(ratingsLabelRow);

    ratingLabels = ['Easiness', 'Helpfulness', 'Clarity', 'Knowledge', 'Textbook Use', 'Exam Difficulty'];
    for (let i = 0; i < ratingLabels.length; i++) {
        const ratingsLabelTd = document.createElement('td');
        ratingsLabelTd.style.textAlign = 'center';
        ratingsLabelTd.style.padding = '0px';
        ratingsLabelTd.style.fontSize = '12px';
        ratingsLabelTd.innerText = ratingLabels[i];
        ratingsLabelRow.appendChild(ratingsLabelTd);
    }

    return ratingsDiv;
}