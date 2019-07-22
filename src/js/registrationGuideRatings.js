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
    devLog('Running: setupTeacherRatings');
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
                devLog(teacherKey);
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
    devLog('Running: integrateTeacherRatings');
    devLog(teacherRatings);
    teacherSearchElements = {};

    courses = document.getElementsByClassName('section-details');
    if (courses.length > 0) {
        
        for (let i = 0; i < courses.length; i++) {

            rows = courses[i].getElementsByTagName('li');
            for (let r = 0; r < rows.length; r++) {
                rowLabel = rows[r].firstElementChild.innerText;
                if (rowLabel.match('Teacher')) {

                    teachers = rows[r].children[1].innerText.split(',');
                    rowAfterTeachers = rows[r].nextSibling;
                    for (let t = 0; t < teachers.length; t++) {
                        teacherName = teachers[t].trim();
                        teacherNameObj = generateTeacherNameObject(teacherName);
                        teacherKey = teacherNameObj.fullNameKey;

                        if (!teacherKey.match(/\d+/g)) {

                            ratingsRow = createRatingsRow(teacherNameObj);
                            
                            courses[i].insertBefore(ratingsRow, rowAfterTeachers);
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
                }
                else if (rowLabel.match('Seats')) {
                    // rename row label to Availability instead of Seats Available so it takes only 1 line
                    rows[r].firstElementChild.innerText = 'Availability';
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
    let teacherSearchURL = ratingsURL + '/search?utf8=%E2%9C%93&country=ca&state=quebec&city=montreal&school=dawson-college&commit=Search&q=';
    if (fullNameSearch) {
        teacherSearchURL += teacherNameObj.firstName + '+';
    }
    teacherSearchURL += teacherNameObj.lastName;
    devLog(teacherSearchURL);

    const xmlRequestInfo = {
        method: 'GET',
        action: 'xhttp',
        url: teacherSearchURL,
    };

    chrome.runtime.sendMessage(xmlRequestInfo, function(data) {
        try {
            if (data.responseXML == 'error') {
                devLog(data);
                updateSavedTeacherRatings(teacherNameObj, teacherURL, failedMessage, -1);
                updateTeacherElementsWithMessage(teacherNameObj, teacherSearchURL, failedMessage);
            } 
            else {
                
                let teacherURL = data.url;
                const htmlParser = new DOMParser();
                const htmlDoc = htmlParser.parseFromString(data.responseXML, 'text/html');
                const searchResults = htmlDoc.querySelectorAll('.card-title a');
                devLog(searchResults);

                if (searchResults.length === 0) { 
                    if (fullNameSearch) {
                        // 0 teacher result from fullNameSearch search so try search with just last name
                        // devLog(teacherNameObj.fullName + ': (zero) ' + teacherURL);
                        getTeacherURL(teacherNameObj, false);
                    }
                    else {
                        // 0 teacher result from search using just last name
                        devLog(teacherNameObj.fullName + ': (zero) ' + teacherURL);
                        getTeacherContent(teacherNameObj, teacherURL, 0);
                    }
                } 
                else if (searchResults.length == 1) { 
                    // 1 teacher result so create url with result
                    teacherURL = searchResults[0].href;
                    devLog(teacherNameObj.fullName + ': ' + teacherURL);
                    getTeacherContent(teacherNameObj, teacherURL, 1);
                } 
                else {
                    //multiple profs so search for exact or close match
                    let teacherFound = false;                    
                    for (let i = 0; i < searchResults.length; i++) {
                        const resultName = searchResults[i].innerText;
                        const resultFirstName = resultName.split(' ')[0].trim(' ');
                        const nameMatches = (getEditDistance(resultFirstName.toLowerCase(), teacherNameObj.firstName.toLowerCase())<=2 || 
                                             resultName.toLowerCase().match(teacherNameObj.firstName.toLowerCase()) || 
                                             teacherNameObj.firstName.toLowerCase().match(resultFirstName.toLowerCase()));
                        if (nameMatches){
                            teacherFound = true;
                            teacherURL = searchResults[i].href;
                        }
                        break;
                    }
                    if (teacherFound) {
                        devLog(teacherNameObj.fullName + ': ' + teacherURL);
                        getTeacherContent(teacherNameObj, teacherURL, 1);
                    }
                    else {
                        devLog(teacherNameObj.fullName + ': (mult) ' + teacherURL);
                        getTeacherContent(teacherNameObj, teacherURL, 2);
                    }                        
                }
            }
        } 
        catch(err) {
            devLog('Error: ' + teacherNameObj.fullName + '\n' + err.stack);
            updateSavedTeacherRatings(teacherNameObj, teacherSearchURL, failedMessage, -1);
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
                devLog(data);
                updateSavedTeacherRatings(teacherNameObj, teacherURL, failedMessage, -1);
                updateTeacherElementsWithMessage(teacherNameObj, teacherURL, failedMessage);
            } 
            else {
                let teacherURL = data.url;

                const htmlParser = new DOMParser();
                const htmlDoc = htmlParser.parseFromString(data.responseXML, 'text/html');

                const rating = {
                    fullName: 'ERROR',
                    easiness: 'ERROR',
                    helpfulness: 'ERROR',
                    clarity: 'ERROR',
                    knowledge: 'ERROR',
                    textbookUse: 'ERROR',
                    examDifficulty: 'ERROR',
                    numOfRatings: 'ERROR'
                };
                
                if (resultCode === 0) {
                    ratingsContent = '❌ Teacher <b>' + teacherNameObj.fullName + '</b> not found. Please click to search.';
                    updateSavedTeacherRatings(teacherNameObj, teacherURL, ratingsContent, 0);
                    updateTeacherElementsWithMessage(teacherNameObj, teacherURL, ratingsContent);

                } 
                else if (resultCode == 2) {
                    ratingsContent = '👥 Multiple teachers found for <b>' + teacherNameObj.fullName + '</b>. Please click to see results.';
                    updateSavedTeacherRatings(teacherNameObj, teacherURL, ratingsContent, 2);
                    updateTeacherElementsWithMessage(teacherNameObj, teacherURL, ratingsContent);

                } 
                else if (resultCode == 1) {
                    
                    if (htmlDoc.querySelector('.alert-primary')) {

                        rating.fullName = htmlDoc.querySelector('.heading-wrap .mb-3').innerText;
                        rating.easiness = parseMetricData(htmlDoc, 'metric-1');
                        rating.helpfulness = parseMetricData(htmlDoc, 'metric-2');
                        rating.clarity = parseMetricData(htmlDoc, 'metric-3');
                        rating.knowledge = parseMetricData(htmlDoc, 'metric-4');
                        rating.textbookUse = parseMetricData(htmlDoc, 'metric-5');
                        rating.examDifficulty = parseMetricData(htmlDoc, 'metric-6');

                        const ratingsCount = htmlDoc.querySelector('p').innerText.match(/Data based on (?<num>[0-9]+) /);
                        rating.numOfRatings = (ratingsCount ? ratingsCount.groups.num : '_');

                        updateSavedTeacherRatings(teacherNameObj, teacherURL, rating, 1);
                        updateTeacherElementsWithRating(teacherNameObj, teacherURL, rating);
                    }
                    else {
                        ratingsContent = '✨ Data found for <b>' + teacherNameObj.fullName + '</b> does not fall under simple categories. Please click to view.';
                        updateSavedTeacherRatings(teacherNameObj, teacherURL, ratingsContent, 3);
                        updateTeacherElementsWithMessage(teacherNameObj, teacherURL, ratingsContent);
                    }

                }                
            }
        } 
        catch(err) {
            devLog('Error: ' + teacherNameObj.fullName + '\n' + err.stack);
            updateSavedTeacherRatings(teacherNameObj, teacherURL, failedMessage, -1);
            updateTeacherElementsWithMessage(teacherNameObj, teacherURL, failedMessage);
        }
    });
}

function parseMetricData(htmlDoc, metricId) {
    let metricData = JSON.parse(htmlDoc.getElementById(metricId).getAttribute('data-ratings'));
    let metricStarSum = 0;
    let metricStarCount = 0;
    for (let i = 0; i < 5; i++) {
        metricStarSum += (i+1)*metricData[i]['value'];
        metricStarCount += metricData[i]['value'];
    }
    let metricAverage = metricStarSum/metricStarCount;
    return (metricAverage ? (Math.round(metricAverage*10)/10).toFixed(1)+' ★' : '_');
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
        devLog('DELETE ' + teacherNameObj.fullName);
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

function createRatingsRow(teacherNameObj) {

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
    ratingsButton.innerText = 'Find ratings for ' + teacherNameObj.fullName + ' with Dawson Enhanced';
    ratingsButton.title = 'Click to find ratings for this teacher.';
    ratingsButton.value = teacherNameObj.fullNameKey;
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
    ratingsDiv.className = 'ratings-summary';
    ratingsDiv.style = 'line-height: 1.6';

    ratingsLinkMessage = '✔️ Data found for <b>' + rating.fullName + '</b> based on ' + rating.numOfRatings + ' teacher rating' + (rating.numOfRatings > 1 ? 's:' : ':');
    const ratingsLink = generateNewTabLink(teacherURL, ratingsLinkMessage);
    ratingsDiv.appendChild(ratingsLink);

    const ratingsTable = document.createElement('table');
    ratingsTable.className = 'ratings-table';
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