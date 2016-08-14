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
	teacherElements = {};
	mutationCount = 0;

	// select the target node
	let target = document.querySelector('#result-message');

	// create an observer instance
	let observer = new MutationObserver(function(mutations) {  
	  	mutations.forEach(function(mutation) {
	  		mutationCount++;
	  		debugLog('mutation count: ' + mutationCount);

	  		if (mutationCount % 2 === 0) {
	  			teacherElements = {};
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
    			if (rows[r].children[0].innerText == 'Teacher') {
    				teacher = rows[r].children[1];
    				teacherName = teacher.innerText;
    				teacherNameObj = generateTeacherNameObject(teacherName);
    				teacherKey = teacherNameObj.fullNameKey;
    				if (!teacherKey.match(/\d+/g)) {
	    				if (teacherElements[teacherKey]) {
	    					teacherElements[teacherKey].elements.push(teacher);
	    				}
	    				else {
	    					teacherElements[teacherKey] = {
	    						nameObj: teacherNameObj, 
	    						elements: [teacher], 
	    						ratings: {}
	    					};
	    				}
	    			}
	    			break;
    			}
    		}
    	}
    	loadRatings();
    }
}


function loadRatings() {
	debugLog(teacherElements);
    debugLog('Load ratings for ' + Object.keys(teacherElements).length + ' teachers');

    teacherElementKeys = Object.keys(teacherElements);
    for (let i = 0; i < teacherElementKeys.length; i++) {
        key = teacherElementKeys[i];
		getTeacherURL(teacherElements[key].nameObj, true);

		divs = teacherElements[key].elements;
		for (let i = 0; i < divs.length; i++) {
			divs[i].innerHTML = '<b>' + divs[i].innerHTML + '</b>';
		}
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
                console.log(data);
                tooltipContent = 'RateMyTeacher data failed to load<br>Please click submit to reattempt';
                updateTeacherElements(teacherNameObj, teacherSearchURL, tooltipContent);
            } 
            else {
            	
                let teacherURL = data.url;
                const htmlParser = new DOMParser();
                const htmlDoc = htmlParser.parseFromString(data.responseXML, 'text/html');
                const searchResults = htmlDoc.getElementsByClassName('teacher_name');

                if (searchResults.length === 0) { 
                    if (fullNameSearch) {
                    	// 0 teacher result from fullNameSearch search so try search with just last name
                    	// console.log(teacherNameObj.fullName + ': (zero) ' + teacherURL);
                        getTeacherURL(teacherNameObj, false);
                    }
                    else {
                        // 0 teacher result from search using just last name
                        console.log(teacherNameObj.fullName + ': (zero FINAL) ' + teacherURL);
                        // getTeacherContent(teacherNameObj, teacherURL, 0);
                    }
                } 
                else if (searchResults.length == 1) { 
                    // 1 teacher result so create url with result
                    teacherURL = 'http://ca.ratemyteachers.com' + searchResults[0].children[0].getAttribute('href');
                    console.log(teacherNameObj.fullName + ': ' + teacherURL);
                    // getTeacherContent(teacherNameObj, teacherURL, 1);
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
                    	console.log(teacherNameObj.fullName + ': (mult)' + teacherURL);
                    	// getProfContent(teacherNameObj, teacherURL, 1);
                    }
                    else {
                    	console.log(teacherNameObj.fullName + ': (mult NM) ' + teacherURL);
                    	// getProfContent(teacherNameObj, teacherURL, 2);
                    }                        
                }
            }
        } 
        catch(err) {
            console.log('Error: ' + teacherNameObj.firstName + ' ' + teacherNameObj.lastName + '\n' + err.stack);
            tooltipContent = 'RateMyTeacher data failed to load<br>Please click submit to reattempt';
            updateTeacherElements(teacherNameObj, teacherSearchURL, tooltipContent);
        }
    });
}


function updateTeacherElements(name, url, content) {

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