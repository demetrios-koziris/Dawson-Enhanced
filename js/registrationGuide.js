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

	var courses = [];

	// select the target node
	var target = document.querySelector('#result-message');

	// create an observer instance
	var observer = new MutationObserver(function(mutations) {  
	  mutations.forEach(function(mutation) {

	    newCourses = document.getElementsByClassName('section-details');
	    if (newCourses.length > 0 && newCourses != courses) {
	    	courses = newCourses;
	    	
	    	teachers = {};
	    	for (var i = 0; i < courses.length; i++) {
	    		rows = courses[i].getElementsByTagName('li');
	    		for (var r = 0; r < rows.length; r++) {
	    			if (rows[r].children[0].innerText == 'Teacher') {
	    				teacher = rows[r].children[1];
	    				teacherName = teacher.innerText;
	    				if (!teacherName.match(/\d+/g)) {
		    				if (teachers[teacherName]) {
		    					teachers[teacherName].push(teacher);
		    				}
		    				else {
		    					teachers[teacherName] = [teacher];
		    				}
		    			}
		    			break;
	    			}
	    		}
	    	}
	    	debugLog(teachers);
	    	debugLog('Load ratings for ' + Object.keys(teachers).length + ' teachers');
	    }
	  });    
	});

	// configuration of the observer:
	var config = { attributes: true, childList: false, characterData: true };

	// pass in the target node, as well as the observer options
	observer.observe(target, config);

}