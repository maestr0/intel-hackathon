var http = require('http');
var seconds = 0;

setInterval(function () {
    seconds++;
    log('Seconds: ' + seconds);
    console.info('Options prepared:');
    console.info(optionsget);
    console.info('Do the GET call');

    // do the GET request
    var reqGet = https.request(optionsget, function (res) {
        console.log("statusCode: ", res.statusCode);
        // uncomment it for header details
        //  console.log("headers: ", res.headers);


        res.on('data', function (d) {
            console.info('GET result:\n');
            process.stdout.write(d);
            console.info('\n\nCall completed');
        });

    });

    reqGet.end();
    reqGet.on('error', function (e) {
        console.error(e);
    });
}, 10000);

