"use strict";
var Twit = require('twit'),
    express = require('express'),
    sentiAnalyze = require('./sentiment.js'),
    fs = require('fs'),
    request = require('request'),
    to_json = require('xmljson').to_json,
    app = express(),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server),
    // bodyParser = require('body-parser'),
    // session = require('cookie-session'),
    consumerKey = "40BUFGlZgi9RjTebP4JbdOL1m",
    consumerSecret = "fpCEuHydnSxjH5K4hgl8AcBCwuTt0hs6ahKVjmesTjwLGbOVp5",
    myoauthAccessToken = "3019225284-H5VR0Ap5aeLgEJajipzzRfDSuA4HhJdJmeh4lVi",
    myoauthAccessTokenSecret = "J48NdwMKtF8bJoYaUbF5lb8jte6ksOxoBTJZJgNN5hMdy",
    T = new Twit({
        consumer_key: consumerKey,
        consumer_secret: consumerSecret,
        access_token: myoauthAccessToken,
        access_token_secret: myoauthAccessTokenSecret
    });
var userSockets = {};
    // trends = [];

// app.use(session({
//   keys: ['key1', 'key2'],
//   secureProxy: false 
// }));

// app.use(bodyParser.urlencoded({ extended: false }));

// // parse application/json
//  app.use(bodyParser.json());

// // parse application/vnd.api+json as json
// app.use(bodyParser.json({ type: 'application/vnd.api+json' }));


server.listen(9000,function(){
    console.log("Listning port 9000");
});

var users = [];

//Get Recent Tweets

app.get('/', function(req, res) {

    // console.log(req.session);
    fs.readFile('./trends.html', 'utf8', function(e, data) {
        if (e) {
            console.log(e);
        } else {
            res.send(data);
        }
    });

    // res.sendFile('./trends.html');
});


function getTrends(woeid, id) {

    T.get('trends/place', {
        id: woeid
    }, function(e, data) {
        if (e) {
            console.log("Getting Trends Error " + e);
        } else {
            // console.log(data[0].trends);
            userSockets[id].trends = data[0].trends.map(function(trend) {

             return trend.name;
            });
            var trackList = userSockets[id].trends.toString();
            userSockets[id].stream = T.stream('statuses/filter', {track:trackList});

            userSockets[id].stream.on('tweet', function(tweet){
                // console.log(tweet.text);
                AnalyzeTweet(tweet, id);
            });

            console.log(userSockets[id].trends);
            userSockets[id].socket.emit('trend-list', {
                trends: userSockets[id].trends
            });
        }
    });
}



function getWoeid(place, id) {
    console.log(place);
    var woeid;
    request("http://where.yahooapis.com/v1/places.q('" + place.place + "')?appid=dj0yJmk9NkY2T2hnTU4wUEhuJmQ9WVdrOWFFMTBhbTE2TlRBbWNH", function(e, res, body) {

        // console.log(body);
        to_json(body, function(error, data) {
            // console.log(data.places.place.woeid);
            woeid = data.places.place.woeid;
            getTrends(woeid, id);
        });

    });
}


io.sockets.on('connection', function(socket) {
    console.log("New Connection " + socket.id);
    userSockets[socket.id] = {
        socket: socket,
        place: '',
        woeid: '',
        trends: [],
        stream:null
    };

    socket.on('place', function(place) {


        console.log(place);


        userSockets[this.id].place = place;

        getWoeid(place, this.id);

    });


    socket.on('disconnect', function(){
        if(userSockets[this.id].stream) {
        userSockets[this.id].stream.removeAllListeners();    
        }
        

            delete userSockets[this.id];

        
        console.log("Disconnected " + this.id);
    }); 
});




function AnalyzeTweet(tweet, id) {

    // console.log("Analyzing tweet");
    var trends = userSockets[id].trends;
    var length = trends.length,
        data;

    while (length--) {

        if (tweet.text.search(trends[length]) != -1) {
            console.log("Got Trending Tweet " + trends[length]);

            data = {
                text: tweet.text,
                sentiScore: sentiAnalyze(tweet.text).score,
                trend: trends[length],
                screen_name: tweet.user.screen_name
            };
            // io.to(trends[length]).emit('got-trend', {
            //     data: data
            // });

            userSockets[id].socket.emit('got-trend', {data:data});
        }
    }
}



// var westros = [ '30.28,45.5,127.06,-5.31' ]; // bouding lat/long of westros

// var location = ['-122.75', '36.8', '-121.75', '37.8'];

// var stream = T.stream('statuses/filter', {
//     location:location
// });
// stream.on('tweet', function(tweet) {
//      console.log(tweet.text);
//     AnalyzeTweet(tweet);
// });
