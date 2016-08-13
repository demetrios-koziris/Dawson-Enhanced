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
    				teacherKey = teacherName.replace(/\s/g, "-");
    				teacher.id = teacherKey;
    				if (!teacherKey.match(/\d+/g)) {
	    				if (teacherElements[teacherKey]) {
	    					teacherElements[teacherKey].elements.push(teacher);
	    				}
	    				else {
	    					teacherElements[teacherKey] = {
	    						name: teacherName, 
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

	for (var key in teacherElements) {

		getTeacherURL(key, teacherElements[key].name);

		divs = teacherElements[key].elements;
		for (let i = 0; i < divs.length; i++) {
			divs[i].innerHTML = '<b>' + divs[i].innerHTML + '</b>';
		}
	}
}


function getTeacherURL(teacherKey, teacherName) {

    let tooltipContent = '';
    let teacherSearchURL = 'http://ca.ratemyteachers.com/search_page?q=' + teacherName + '+dawson&search=teachers&state=qc';
    let testURL = 'https://www.google.ca/search?q=ratemyteachers+dawson+college+quebec+' + teacherName;

    const xmlRequestInfo = {
        method: 'GET',
        action: 'xhttp',
        url: testURL,
    };

    chrome.runtime.sendMessage(xmlRequestInfo, function(data) {
        try {
            if (data.responseXML == 'error') {
                console.log(data);
                tooltipContent = 'RateMyTeacher data failed to load<br>Please click submit to reattempt';
                updateTeacherElements(teacherName, teacherSearchURL, tooltipContent);
            } 
            else {
            	console.log(teacherName);
                let teacherURL = data.url;
                const htmlParser = new DOMParser();
                const htmlDoc = htmlParser.parseFromString(data.responseXML, 'text/html');
                // console.log(htmlDoc);
                // const searchResults = htmlDoc.getElementById('CSE_search');
                // console.log(searchResults);
                // const searchResults = htmlDoc.getElementById('content');
                // console.log(searchResults);
                const searchResults = htmlDoc.getElementsByClassName('r')[0];
                console.log(searchResults);
            }
        } 
        catch(err) {
            console.log('Error: ' + teacherName + '\n' + err.stack);
            tooltipContent = 'RateMyTeacher data failed to load<br>Please click submit to reattempt';
            updateTeacherElements(teacherName, teacherSearchURL, tooltipContent);
        }
    });
}


function updateTeacherElements(name, url, content) {

}