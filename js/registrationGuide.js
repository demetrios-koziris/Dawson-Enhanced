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

	var oldTeachers = null;
	var mutationCount = 0;

	// select the target node
	let target = document.querySelector('#result-message');

	// create an observer instance
	let observer = new MutationObserver(function(mutations) {  
	  	mutations.forEach(function(mutation) {
	  		mutationCount++;
	  		debugLog('mutation count: ' + mutationCount);


		    courses = document.getElementsByClassName('section-details');

		    if (courses.length > 0){//} && newCourses != courses) {
		    	
		    	newTeachers = {};
		    	for (let i = 0; i < courses.length; i++) {
		    		rows = courses[i].getElementsByTagName('li');
		    		for (let r = 0; r < rows.length; r++) {
		    			if (rows[r].children[0].innerText == 'Teacher') {
		    				teacher = rows[r].children[1];
		    				teacherName = teacher.innerText;
		    				if (!teacherName.match(/\d+/g)) {
			    				if (newTeachers[teacherName]) {
			    					newTeachers[teacherName].push(teacher);
			    				}
			    				else {
			    					newTeachers[teacherName] = [teacher];
			    				}
			    			}
			    			break;
		    			}
		    		}
		    	}

		    	if (JSON.stringify(oldTeachers) !== JSON.stringify(newTeachers)) {
		    		oldTeachers = newTeachers;
			    	debugLog(newTeachers);
			    	debugLog('Load ratings for ' + Object.keys(newTeachers).length + ' teachers');

					for (var key in oldTeachers) {
						divs = oldTeachers[key];
						for (let i = 0; i < divs.length; i++) {
							divs[i].innerHTML = '<b>' + divs[i].innerHTML + '</b>';
						}
					}

			    }

		    }
		    

	  	});    
	});

	// configuration of the observer:
	let config = { attributes: true, childList: false, characterData: true };

	// pass in the target node, as well as the observer options
	observer.observe(target, config);

}


