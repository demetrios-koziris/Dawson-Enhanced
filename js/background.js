chrome.extension.onRequest.addListener(function(request, sender, callback) {
    switch (request.name) {
         case 'form_submit':
             var data = request.data;
             console.log("Form submitted!");
             callback();
             break;
     }
});