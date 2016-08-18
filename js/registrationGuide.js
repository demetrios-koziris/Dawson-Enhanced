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


function integrateRatings() {

	debugLog('Running integrateRatings');

	teacherRatings = {};
	teacherData = {};
	mutationCount = 0;

	// select the target node
	let target = document.querySelector('#result-message');

	// create an observer instance
	let observer = new MutationObserver(function(mutations) {  
	  	mutations.forEach(function(mutation) {
            mutationCount++;

	  		if (mutationCount % 2 === 0) {
                debugLog('mutation count: ' + mutationCount);
                debugLog(teacherRatings);

	  			teacherData = {};
	  			parseTeachers();
	  		}

	  	});    
	});

	// configuration of the observer:
	let config = { attributes: true, childList: false, characterData: true };

	// pass in the target node, as well as the observer options
	observer.observe(target, config);

}


function parseTeachers() {

	courses = document.getElementsByClassName('section-details');
    if (courses.length > 0) {
    	
    	for (let i = 0; i < courses.length; i++) {

    		rows = courses[i].getElementsByTagName('li');
    		for (let r = 0; r < rows.length; r++) {
    			if (rows[r].firstElementChild.innerText.match('Teacher')) {

                    teachers = rows[r].children[1].innerText.split(',');
                    for (let t = 0; t < teachers.length; t++) {
                        teacherName = teachers[t].trim();
                        teacherNameObj = generateTeacherNameObject(teacherName);
                        teacherKey = teacherNameObj.fullNameKey;

        				if (!teacherKey.match(/\d+/g)) {
                            ratingsRow = document.createElement('li');
                            ratingsRow.setAttribute('class', 'row');
                            ratingsRow.innerHTML = '<label class="col-md-2">Ratings</label><div class="col-md-10 schedule"><div>';
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
    		}
    	}

    	loadRatings();
    }
}


function loadRatings() {
	debugLog(teacherData);
    debugLog('Load ratings for ' + Object.keys(teacherData).length + ' teachers');

    teacherElementKeys = Object.keys(teacherData);
    for (let i = 0; i < teacherElementKeys.length; i++) {
        teacherKey = teacherElementKeys[i];
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
            getTeacherURL(teacherData[teacherKey].nameObj, true);
        }
	}
}


function setLoadingGif(teacherKey) {
    teacherDivs = teacherData[teacherKey].elements;
    for (let i = 0; i < teacherDivs.length; i++) {
        teacherDivs[i].innerHTML = '<div id="loadingDiv" style="padding-top: 6px;"><img style="display:inline;" src="https://timetable.dawsoncollege.qc.ca/wp-content/plugins/timetable//assets/images/ajax-loader.gif"></div>';
    }
}


function getTeacherURL(teacherNameObj, fullNameSearch) {

    let tooltipContent = '';
    let teacherSearchURL = 'http://ca.ratemyteachers.com/dawson-college/38432-s?q=';
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
                tooltipContent = 'RateMyTeacher data failed to load. Please click Search to reload.';
                updateSavedTeacherRatings(teacherNameObj, teacherURL, tooltipContent, -1);
                updateTeacherElementsWithMessage(teacherNameObj, teacherSearchURL, tooltipContent);
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
                    teacherURL = 'http://ca.ratemyteachers.com' + searchResults[0].children[0].getAttribute('href');
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
                            teacherURL = 'http://ca.ratemyteachers.com' + searchResults[0].children[0].getAttribute('href');
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
            tooltipContent = 'RateMyTeacher data failed to load. Please click Search to reload.';
            updateSavedTeacherRatings(teacherNameObj, teacherURL, tooltipContent, -1);
            updateTeacherElementsWithMessage(teacherNameObj, teacherSearchURL, tooltipContent);
        }
    });
}


function getTeacherContent(teacherNameObj, teacherURL, resultCode) {

    // updateProfURL(profName.fullNameKey, profURL);
    const xmlRequestInfo = {
        method: 'GET',
        action: 'xhttp',
        url: teacherURL,
    };
    let tooltipContent = '';

    chrome.runtime.sendMessage(xmlRequestInfo, function(data) {
        try {

            if (data.responseXML == 'error') {
                debugLog(data);
                tooltipContent = 'RateMyTeacher data failed to load. Please click Search to reload.';
                updateSavedTeacherRatings(teacherNameObj, teacherURL, tooltipContent, -1);
                updateTeacherElementsWithMessage(teacherNameObj, teacherURL, tooltipContent);
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
                    tooltipContent = 'Teacher ' + teacherNameObj.fullName + ' not found. Please click to search RMT.';
                    updateSavedTeacherRatings(teacherNameObj, teacherURL, tooltipContent, 0);
                    updateTeacherElementsWithMessage(teacherNameObj, teacherURL, tooltipContent);

                } 
                else if (resultCode == 2) {
                    tooltipContent = 'Multiple teachers found for ' + teacherNameObj.fullName + '. Please click to see results.';
                    updateSavedTeacherRatings(teacherNameObj, teacherURL, tooltipContent, 2);
                    updateTeacherElementsWithMessage(teacherNameObj, teacherURL, tooltipContent);

                } 
                else if (resultCode == 1) {
                    
                    if (htmlDoc.getElementsByClassName('rating-summary').length < 2) {
                        //See Vincenzo Lentini: http://ca.ratemyteachers.com/vince-lentini/6135115-t
                        tooltipContent = 'Teacher ' + teacherNameObj.fullName + ' has no ratings. Please click to be the first to rate.';
                        updateSavedTeacherRatings(teacherNameObj, teacherURL, tooltipContent, 0);
                        updateTeacherElementsWithMessage(teacherNameObj, teacherURL, tooltipContent);
                    } 
                    else {
                        
                        ratingElem = htmlDoc.getElementsByClassName('rating-summary')[0];
                        if (ratingElem) {
                            ratingSummary = ratingElem.innerText.split('\n');
                            rating.overall = ratingSummary[2];
                            rating.numOfRatings = ratingSummary[4];
                            // rating.summary = ratingElem.innerText.replace(/\n/g, ' ');
                        }
                        rating.fullName = parseRatingData(htmlDoc, 'teacher_name')
                        rating.easiness = parseRatingData(htmlDoc, 'easy')
                        rating.helpfulness = parseRatingData(htmlDoc, 'helpful')
                        rating.clarity = parseRatingData(htmlDoc, 'clarity')
                        rating.knowledge = parseRatingData(htmlDoc, 'knowledgeable')
                        rating.textbookUse = parseRatingData(htmlDoc, 'textbook_use')
                        rating.examDifficulty = parseRatingData(htmlDoc, 'exam_difficulty')

                        tooltipContent = '<div class="ratings-summary" style="line-height: 1;"><a href="' + teacherURL + '" target="_blank">';
                        tooltipContent += rating.fullName + ': <b>' + rating.overall + '</b> average based on ';
                        tooltipContent += rating.numOfRatings + ' professor rating' + (rating.numOfRatings > 1 ? 's' : '');
                        tooltipContent += '</a></div><table class="ratings-table" style="table-layout: fixed; line-height: 1;">';
                        tooltipContent += '<tbody><tr>';
                        ratingDataKeys = ['easiness', 'helpfulness', 'clarity', 'knowledge', 'textbookUse', 'examDifficulty'];
                        for (let i = 0; i < ratingDataKeys.length; i++) {
                            tooltipContent += '<td style="text-align: center;">' + rating[ratingDataKeys[i]] + '</td>';
                        }
                        tooltipContent += '</tr></tbody><tbody><tr>';
                        ratingLabels = ['Easiness', 'Helpfulness', 'Clarity', 'Knowledge', 'Textbook Use', 'Exam Difficulty'];
                        for (let i = 0; i < ratingLabels.length; i++) {
                            tooltipContent += '<td style="text-align: center; padding: 0px; font-size: 12px;">' + ratingLabels[i] + '</td>';
                        }
                        tooltipContent += '</tr></tbody></table>';

                        updateSavedTeacherRatings(teacherNameObj, teacherURL, tooltipContent, 1);
                        updateTeacherElementsWithRating(teacherNameObj, teacherURL, tooltipContent);
                    }
                }                
            }
        } 
        catch(err) {
            debugLog('Error: ' + teacherNameObj.fullName + '\n' + err.stack);
            tooltipContent = 'RateMyTeacher data failed to load. Please click Search to reload.';
            updateSavedTeacherRatings(teacherNameObj, teacherURL, tooltipContent, -1);
            updateTeacherElementsWithMessage(teacherNameObj, teacherURL, tooltipContent);
        }
    });
}


function parseRatingData(htmlDoc, className) {
    ratingElem = htmlDoc.getElementsByClassName(className)[0];
    if (ratingElem) {
        return ratingElem.innerText.trim();
    }
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


function updateTeacherElementsWithRating(teacherNameObj, teacherURL, tooltipContent) {
    if (teacherData[teacherNameObj.fullNameKey]) {
        const teacherElements = teacherData[teacherNameObj.fullNameKey].elements;
        for (let p = 0; p < teacherElements.length; p++) {
            teacherElements[p].setAttribute('class', 'col-md-10 schedule');
            teacherElements[p].innerHTML = tooltipContent;
        }
    }
}


function updateTeacherElementsWithMessage(teacherNameObj, teacherURL, message) {
    if (teacherData[teacherNameObj.fullNameKey]) {
        const teacherElements = teacherData[teacherNameObj.fullNameKey].elements;
        for (let p = 0; p < teacherElements.length; p++) {
            teacherElements[p].setAttribute('class', 'col-md-10');
            linkHTML = '<a href="' + teacherURL + '" target="_blank">' + message + '</a>';   
            teacherElements[p].innerHTML = linkHTML;
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