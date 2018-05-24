const http = require('http');
const request = require('request');
const moment = require('moment');
require('es6-promise').polyfill();
require('isomorphic-fetch');

const config = require('./config');
const hostname = config.host;
const port = config.port;
var previousPrice = -1;
var highestValue = 0;
var lowestValue = 0;

function processData(data) {
    var resultData = {};

    for (var i = 0; i < data.length; i++) {
        var result = {};
        var inData = data[i];
        var date = (inData.timestamp).split('T')[0];
        var dayOfWeek = moment(date).format('dddd');
        var price = inData.lastPrice;
        
        // Initialize the data with default values (will act as fall back if any data is missing)
        result['price'] = price;
        result['priceChange'] = 'na';
        result['change'] = 'na';
        result['dayOfWeek'] = dayOfWeek;
        result['highSinceStart'] = false;
        result['lowSinceStart'] = false;

        // Fill in the actual data
        if (previousPrice !== -1) {
            if (price > previousPrice) { result['priceChange'] = 'up'; }
            else if (price < previousPrice) { result['priceChange'] = 'down'; }
            else { result['priceChange'] = 'same'; }
            result['change'] = Math.abs(price - previousPrice).toFixed(2);
            previousPrice = price;

            if (price > highestValue) {
                highestValue = price;
                result['highSinceStart'] = true;
            }

            if (price < lowestValue) {
                lowestValue = price;
                result['lowSinceStart'] = true;
            }

        }
        else {
            highestValue = price;
            lowestValue = price;
            previousPrice = price;
            result['highSinceStart'] = true;
            result['lowSinceStart'] = true;
        }

        resultData[date] = result;
    }

    return resultData;
}

function fetchData(res) {
    fetch(config.apiURL)
    .then((resp) => resp.json())
    .then(function(data) {
        // Process the data in reverse order so that the oldest date comes first
        var result = processData(data.reverse());

        // Send back the result
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(result));
    })
}

const server = http.createServer((req, res) => {
    fetchData(res);
});

server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});