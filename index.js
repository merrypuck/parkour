var express 		= require('express.io');
var app 			= express();
var request 		= require('request');
var moment 			= require('moment');
var _ 				= require('lodash');
var io 				= require('socket.io').listen(app);
var fs				= require('fs');
var geolib 			= require('geolib');
var mongoose		= require('mongoose');
var cycleCalculator	= require('./search_algorithm/calculate_cycles.js');
var csv = require("fast-csv");

/*
csv.fromPath("navcodes.csv").on("record", function(data){ 
	var navcodes = data[0].substring(1, data[0].length-1).split(',');
	var id = data[1];
	var color = data[2];
	var s1 = data[3];
	var s2 = data[4];
	var s3 = data[5];
	var side = data[6];
	console.log(codes);
})
.on("end", function() { 
		console.log("done");});

*/

//////////////////////////////////
// Express app config
/////////////////////////////////

app.engine('ejs', require('ejs-locals'));//.renderFile);
app.set('port', (process.env.PORT || 5000))
app.use(express.static(__dirname + '/public'))
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.set('view options', {layout: "template.html"});
app.http().io();

var parking_file = "./examples/get_parking_lots.txt";

/********************* MONGOOSE INIT ****************************/

// var mongoose = require('mongoose');

// mongoose.connect('mongodb://abc:abc123@kahana.mongohq.com:10088/parkour');

var db = mongoose.connection;

// Error handling
db.on('error', console.error.bind(console, 'connection error:'));

db.once('open', function callback() {
  console.log('Connected to DB');
});


//////////////////////////////////
// Express handlers
/////////////////////////////////
app.get('/', function(req, res) {
	res.render('home')
  	
});

app.get('/park_here', function(req, res) {
  res.render('park_here');
});

app.get('/map', function(req, res) {
	var allCodes = [];
	csv.fromPath("navandcolors.csv").on("record", function(data){ 
		try {

			var navcodes = data[0].substring(1, data[0].length -1).split(',');
			var id = data[1];
			var color = data[2];
			var obj = {'n' : navcodes, 'id' : id, 'c' : color}
			allCodes.push(obj);
			// console.log(obj);
		}
		catch(e) {
			console.log(e);
		}

	})
	.on("end", function() { 
		var stringCodes = JSON.stringify(allCodes);
		res.render('map1', {
			allCodes : stringCodes
		});
	});
	
});

app.get('/direct', function(req, res) {
	res.redirect("/");
});

app.get('/api/do-parkour', function(req, res){
	var loc = {
		lat: Number(req.query.lat),
		lon: Number(req.query.lon),
	};

	if(loc.lat && loc.lon)
	{
		var result = cycleCalculator.do_parkour(loc, 500);
		res.send(result);
	}
	else
	{
		res.send([]);
	}
});

app.get('/api/parking-nearby', function(req, res){

	var loc = {
		lat: req.query.lat,
		lon: req.query.lon
	};

	if(loc.lat && loc.lon)
	{

		fs.readFile(parking_file, 'utf8', function (err, data) {
			if (err) {
				console.log('Error: ' + err);
				return;
			}

			data = JSON.parse(data);

			if(data.Results && data.Results.tblStations)
			{
				var sorted_array = _.sortBy(data.Results.tblStations, function(elem, index){
					var dist = geolib.getDistance(
					    {latitude: loc.lat, longitude: loc.lon}, 
					    {latitude: elem.p_OutDecLotLatitude, longitude: elem.p_OutDecLotLongitude}
					);
					//console.log("Distance = " + dist);
					return dist;
				});

				var result_array = _.filter(sorted_array, function(value, index, collection){
					return index < 10;
				});

				var our_format = _.map(result_array, function(value, index){
					return {
						pangoId: value.p_OutIntLotID,
						lat: value.p_OutDecLotLatitude,
						lon: value.p_OutDecLotLongitude,
						name: value.p_OutStrLotName,
						phone: value.p_OutStrLotPhoneNumber,
						address: value.p_OutStrLotAddress,
						isLotFull: value.p_OutIsLotFull,
						discountAmount: value.p_OutDecPercentDiscount,
						discountText: value.p_OutStrShortName
					};
				});

				console.log("Returning " + result_array.length + " results to my query for " + loc.lat + " / " + loc.lon);

				res.send(our_format);
			}
			else
			{
				console.log("Reading the file returned an empty data set");
				res.send({});
			}
		});
	}
	else
	{
		console.log("Asked to return nearby parking spots, but nothing found");
		res.send({error: "Need to provide lat and lon"});
	}
});

app.get('/screen1', function(req, res){
	res.render('screen1');
});

app.get('/screen2', function(req, res){
	res.render('screen2');
});

app.get('/screen3', function(req, res){
	res.render('screen3');
});

app.post('/direct', function(req, res) {
	var starting_location = req.body.starting_location;
	var end_location = req.body.end_location;
	var radius = req.body.radius;
});

app.get('/mapdev', function(req, res) {
	res.render('mapdev')
});

//////////////////////////////////
// Web client sockets
/////////////////////////////////

app.io.route('ready', function(req) {
    req.io.emit('zazti_notices', {
        message: 'io event from an io route on the server'
    })

    console.log("Got a ready message from client");
});

io.sockets.on('connection', function (socket) {
	console.log("Server received socket io request");
	socket.emit("hello", "Saying hello to the web client");
});

app.listen(app.get('port'), function() {
  console.log("Node app is running at localhost:" + app.get('port'))
});

