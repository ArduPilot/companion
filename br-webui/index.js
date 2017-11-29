var express = require('express');
var app = express();
const child_process = require('child_process');
const dgram = require('dgram');
const SocketIOFile = require('socket.io-file');
var logger = require('tracer').console();
var os = require("os");
var env = process.env
logger.log('ENVIRONMENT', process.env)
logger.log('COMPANION_DIR', process.env.COMPANION_DIR)
app.use(express.static('public'));
app.use('/js', express.static(__dirname + '/node_modules/bootstrap/dist/js')); // redirect bootstrap JS
app.use('/js', express.static(__dirname + '/node_modules/jquery/dist')); // redirect JS jQuery
app.use('/font-awesome', express.static(__dirname + '/node_modules/font-awesome')); // redirect JS jQuery
app.use('/css', express.static(__dirname + '/node_modules/bootstrap/dist/css')); // redirect CSS bootstrap
app.use('/style.css', express.static(__dirname + '/style.css')); // redirect CSS bootstrap

var fs = require("fs");
var expressLiquid = require('express-liquid');
var options = {
	// read file handler, optional 
	includeFile: function (filename, callback) {
		fs.readFile(filename, 'utf8', callback);
	},
	// the base context, optional 
	context: expressLiquid.newContext(),
	// custom tags parser, optional 
	customTags: {},
	// if an error occurred while rendering, show detail or not, default to false 
	traceError: false
};
app.set('view engine', 'liquid');
app.engine('liquid', expressLiquid(options));
app.use(expressLiquid.middleware);

// Companion repository root directory
var _companion_directory = process.env.COMPANION_DIR;

////////////////// Routes

// root
app.get('/', function(req, res) {
	res.render('index', {});
});

app.get('/routing', function(req, res) {
	res.render('routing', {});
});

app.get('/system', function(req, res) {
	res.render('system', {});
});

app.get('/camera', function(req, res) {
	res.render('camera', {});
});

app.get('/network', function(req, res) {
	res.render('network', {});
});

app.get('/waterlinked', function(req, res) {
	res.render('waterlinked', {});
});

app.get('/security', function(req, res) {
	res.render('security', {});
});


// Thank you > https://github.com/nesk/network.js/issues/8
app.get('/test', function(req, res) {
	var module = req.param('module');
	//console.log("Dealing with: ", module);

	res.set({
		// Make sure the connection closes after each request
		'Connection': 'close',
		// Don't let any caching happen
		'Cache-Control': 'no-cache, no-store, no-transform',
		'Pragma': 'no-cache',
	})
	

	if (module && module == 'download') {
		res.sendFile(_companion_directory + '/tools/100MB.file');

//		// Default to 20mb file download, unless a size is specified.
//		var contentSize = req.param('size', 20 * 1024 * 1024);
//		var baseString = 'This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. This text is so uncool, deal with it. ';
//		var baseLength = baseString.length;
//
//		// Make this an application/octet-stream
//		res.set('Content-Type', 'application/octet-stream');
//
//		for (var i = 0; i < parseInt(contentSize / baseLength); i++) {
//			res.write(baseString);
//		}
//
//		var lastBytes = contentSize % baseLength;
//
//		if (lastBytes > 0) {
//			res.write(baseString.substring(0, lastBytes));
//		}
//
//		res.send();

	} else {
		// We need to actually send something, otherwise express just hangs forever
		res.send('OK');
	}
});

app.post('/test', function(req, res) {
	var module = req.param('module');
	//console.log("Dealing with: ", module);
	res.set('Content-Type', 'text/html; charset=UTF-8');
	res.set('Connection', 'close');
	
	var body = ''
	
	var length = 0;
	
	if (module && module == 'upload') {
		req.on('data', function(data) { });
	
		req.on('end', function() {
			console.log('end', length);
			res.send('bye.');
		});
	} else {
		res.send("bye.");
	}
});

app.get('/home/pi/server.php', function(req, res) {
	return res.sendFile('/home/pi/server.php');
});

app.get('/git', function(req, res) {
	res.render('git', {});
});

app.get('/socket.io-file-client.js', (req, res, next) => {
	return res.sendFile(__dirname + '/node_modules/socket.io-file-client/socket.io-file-client.js');
});

app.get('/network.min.js', (req, res, next) => {
	return res.sendFile(__dirname + '/node_modules/network-js/dist/network.min.js');
});

var server = app.listen(2770, function() {
	var host = server.address().address;
	var port = server.address().port;
	logger.log("App running at http://%s:%s", host, port);
	
	var cmd = child_process.exec('git describe --tags', function(error, stdout, stderr) {
		logger.log('Companion version: ', stdout);
	});
	
	var cmd = child_process.exec('git rev-parse HEAD', function(error, stdout, stderr) {
		logger.log('Git revision: ', stdout);
	});
});

var io = require('socket.io')(server);
var networking = io.of('/networking');
var gitsetup = io.of('/gitsetup');


///////////////////////////////////////////////////////////////
////////////////   Git setup functions   //////////////////////
///////////////////////////////////////////////////////////////

var Git = require('nodegit');

var _current_HEAD = '';

//hack/workaround for remoteCallback spinlock
var _authenticated = false;

// We store all of the remote references in this format:
//var _refs = {
//	'remotes' :  {
//		
//		'upstream' : {
//			'branches' : [],
//			'tags'     : []
//		},
//		
//		'origin' : {
//			'branches' : [],
//			'tags'     : []
//		}
//	}
//}

// TODO open/init git repository in callback here
checkGithubAuthentication();

var _refs = { 'remotes' : {} };

var companionRepository = null;
Git.Repository.open(_companion_directory)
	.then(function(repository) {
		companionRepository = repository;
		updateCurrentHead(companionRepository);
		emitRemotes();
	})
	.catch(function(err) { logger.log(err); });

function updateCurrentHEAD(repository) {
	repository.head()
		.then(function(reference) {
			_current_HEAD = reference.target().tostrS().substring(0,8);
			io.emit('current HEAD', _current_HEAD);
			console.log('Current HEAD:', reference.target().tostrS().substring(0,8));
		});
}

//Set up fetch options and credential callback
var fetchOptions = new Git.FetchOptions();
var remoteCallbacks = new Git.RemoteCallbacks();

remoteCallbacks.credentials = function(url, userName) {
	logger.log('credentials required', url, userName);

	if (!_authenticated) {
		return null;
	}
	
	var creds = Git.Cred.sshKeyFromAgent(userName);
	return creds;
}
fetchOptions.callbacks = remoteCallbacks;
fetchOptions.downloadTags = 1;

// Fetch and parse remote references, add them to our list
// Emit our list after each remote's references are parsed
function formatRemote(remoteName) {
	// Add new remote to our list
	var newRemote = {
			'branches' : [],
			'tags' : []
		}
	_refs.remotes[remoteName] = newRemote;
	
	companionRepository.getRemote(remoteName)
		.then(function(remote) {
			logger.log('connecting to remote', remote.name());
			remote.connect(Git.Enums.DIRECTION.FETCH, remoteCallbacks)
			.then(function(errorCode) {
				// Get a list of refs
				remote.referenceList()
				.then(function(promiseArrayRemoteHead) {
					// Get the name of each ref, determine if it is a branch or tag
					// and add it to our list
					promiseArrayRemoteHead.forEach(function(ref) {
						var branch
						var tag
						var oid = ref.oid().tostrS().substring(0,8);
						if (branch = ref.name().split('refs/heads/')[1]) {
							var newRef = [branch, oid]
							_refs.remotes[remoteName].branches.push(newRef);
						} else if (tag = ref.name().split('refs/tags/')[1]) {
							var newRef = [tag, oid]
							_refs.remotes[remoteName].tags.push(newRef);
						}
					});
					
					// Update frontend with most recent list
					io.emit('refs', _refs);
				})
				.catch(function(err) { logger.log(err); });
			})
			.catch(function(err) { logger.log(err); });
		})
		.catch(function(err) { logger.log(err); });
}


// Fetch, format, emit the refs on each remote
function formatRemotes(remoteNames) {
	logger.log('formatRemotes', remoteNames);
	remoteNames.forEach(formatRemote);
}


// Get all remote references, compile a formatted list, and update frontend
function emitRemotes() {
	if (companionRepository == null) {
		return;
	}
	
	updateCurrentHEAD(companionRepository);
	
	companionRepository.getRemotes()
		.then(formatRemotes)
		.catch(function(err) { logger.log(err); });
}


//Check to see if we have ssh authentication with github
function checkGithubAuthentication(callback) {
	var cmd = 'ssh -T git@github.com';
	child_process.exec(cmd, function(err, stdout, stderr) {
		logger.log(cmd + ' returned ' + err ? err.code : '0');
		logger.log('stdout:\n' + stdout);
		logger.log('stderr:\n' + stderr);
		
		// github greeting comes through stderr
		_authenticated = err ? err.code == 1 && stderr.indexOf('successfully authenticated') > -1 : false;
		
		logger.log(err.code == 1);
		logger.log(stderr.indexOf('successfully authenticated'));
		logger.log(_authenticated);
		
		if (callback) {
			callback(_authenticated);
		}
	});
}


// Let frontend know if we are authenticated or not
function emitAuthenticationStatus(status) {
	io.emit('authenticated', status);
}


// Not used
// fetch a remote by name
function fetchRemote(remote) {
	logger.log('fetching', remote);
	companionRepository.fetch(remote, fetchOptions)
		.then(function(status) {
			logger.log('fetch success', status);
		})
		.catch(function(status) {
			logger.log('fetch fail', status);
		});
}


// Checkout a reference object
function checkout(reference) {
	logger.log('reference', reference.name());
	companionRepository.checkoutRef(reference)
		.catch(function(err) { logger.log(err); });
}

///////////////////////////////////////////////////////////////
////////////////  ^Git setup functions^  //////////////////////
///////////////////////////////////////////////////////////////


gitsetup.on('connection', function(socket) {
	// Populate frontend reference list
	emitRemotes(companionRepository);
	
	// Request to checkout remote reference
	socket.on('checkout with ref', function(data) {
		var referenceName = '';
		
		if (data.branch) {
			referenceName = data.remote + "/" + data.branch;
		} else if (data.tag) {
			// TODO delete tag and fetch first
			referenceName = data.tag;
		}
		
		// Get reference object then checkout
		companionRepository.getReference(referenceName)
		.then(checkout)
		.catch(function(err) {
			logger.log(err);
			socket.emit('git error', err);
		});
	});
	
	// Request to run companion update scripts to update
	// to target reference
	socket.on('update with ref', function(data) {
		
		var arg1 = data.remote;
		var arg2 = '';
		var arg3 = '';
		var arg4 = '';
		
		if (data.copyOption) {
			arg4 = data.copyOption;
			console.log('ARG 4', arg4);
		}
		
		if (data.branch) {
			arg2 = data.branch;
		} else if (data.tag) {
			// TODO delete tag and fetch first
			arg3 = data.tag;
		}
		
		var args = [arg1, arg2, arg3, arg4];
		
		// system setup
		logger.log("update companion with ref", args);
		var cmd = child_process.spawn(_companion_directory + '/scripts/update.sh', args, {
			detached: true
		});

		// Ignore parent exit, we will restart this application after updating
		cmd.unref();
		
		cmd.stdout.on('data', function (data) {
			logger.log(data.toString());
			
			socket.emit('terminal output', data.toString());
			if (data.indexOf("Update Complete, refresh your browser") > -1) {
				socket.emit('companion update complete');
			}
		});
		
		cmd.stderr.on('data', function (data) {
			logger.error(data.toString());
			socket.emit('terminal output', data.toString());
		});
		
		cmd.on('exit', function (code) {
			logger.log('companion update exited with code ' + code.toString());
			socket.emit('companion update complete');
		});
		
		cmd.on('error', (err) => {
			logger.error('companion update errored: ', err.toString());
		});
	});
	
	// Fetch all remotes and update
	socket.on('fetch', function(data) {
		logger.log('fetching remotes');
		companionRepository.fetchAll(fetchOptions)
			.then(emitRemotes)
			.catch(function(err) {
				logger.log(err);
				socket.emit('git error', err);
			});
	});
	
	// Frontend requesting authentication status
	socket.on('authenticated?', function(data) {
		checkGithubAuthentication(emitAuthenticationStatus)
	});
	
	// Get credentials from frontend, authenticate and update
	socket.on('credentials', function(data) {
		var cmd = _companion_directory + '/scripts/authenticate-github.sh ' + data.username + ' ' + data.password;
		child_process.exec(cmd, function(err, stdout, stderr) {
			logger.log('Authentication returned ' + err);
			logger.log('stdout:\n' + stdout);
			logger.log('stderr:\n' + stderr);
			checkGithubAuthentication(function(status) {
				emitAuthenticationStatus(status);
				emitRemotes();
			});
		});
	});
	
	// Add a remote to the local repository
	socket.on('add remote', function(data) {
		logger.log('add remote', data);
		Git.Remote.create(companionRepository, data.name, data.url)
			.then(function(remote) {
				emitRemotes();
			})
			.catch(function(err) {
				logger.log(err);
				socket.emit('git error', err);
			});
	});
});

networking.on('connection', function(socket) {
	
	// Network setup
	socket.on('join network', function(data) {
		logger.log('join network');
		
		try {
			var passphrase = child_process.execSync("wpa_passphrase '" + data.ssid + "' '" + data.password + "'");
			
			var networkString = passphrase.toString();
			networkString = networkString.replace(/\t#.*\n/g, ''); // strip unencrypted password out
			networkString = networkString.replace(/"/g, '\\"'); // escape quotes
			
			logger.log(networkString);
			
			// Restart the network in the callback
			cmd = child_process.exec("sudo sh -c \"echo '" + networkString + "' > /etc/wpa_supplicant/wpa_supplicant.conf\"", function (error, stdout, stderr) {
				logger.log("sudo sh -c \"echo '" + networkString + "' > /etc/wpa_supplicant/wpa_supplicant.conf\" : ", error + stdout + stderr);
				var cmd = child_process.exec('sudo ifdown wlan0 && sudo ifup wlan0', function (error, stdout, stderr) {
					logger.log("restarting network");
					logger.log(error + stdout + stderr);
					socket.emit('join complete');
				});
			}); 
		} catch (e) {
			logger.error(e);
			socket.emit('join complete');
		}
	});
	
	
	// Network setup
	socket.on('get wifi aps', function() {
		logger.log("get wifi aps");
		try {
			var cmd = child_process.execSync('sudo wpa_cli scan');
			logger.log("sudo wpa_cli scan : ", cmd.toString());
		} catch (e) {
			logger.error("wpa_cli scan failed!", e.stderr.toString(), e);
			
			logger.log("WiFi scan failed, attempting to repair configuration....");
			logger.log("Fetching current contents....");
			cmd = child_process.execSync("sudo cat /etc/wpa_supplicant/wpa_supplicant.conf");
			logger.log(cmd.toString());
			
			logger.log("Bringing down wlan0....");
			cmd = child_process.execSync("sudo ifdown wlan0");
			logger.log(cmd.toString());
			
			logger.log("Writing over config....");
			cmd = child_process.execSync("sudo sh -c 'echo > /etc/wpa_supplicant/wpa_supplicant.conf'");
			logger.log(cmd.toString());
			
			logger.log("Bringing wlan0 up....");
			cmd = child_process.execSync("sudo ifup wlan0");
			logger.log(cmd.toString());
			
			return;
		}
		
		try {
			cmd = child_process.execSync('sudo wpa_cli scan_results | grep PSK | cut -f5 | grep .');
			logger.log("wpa_cli scan_results: ", cmd.toString());
			socket.emit('wifi aps', cmd.toString().trim().split("\n"));
		} catch (e) {
			logger.error("wpa_cli scan_results failed!", e.stderr.toString(), e);
		}
	});
	
	
	socket.on('get wifi status', function() {
		logger.log("get wifi status");
		var cmd = child_process.exec('sudo wpa_cli status', function (error, stdout, stderr) {
			logger.log("sudo wpa_cli status : ", error + stdout + stderr);
			if (error) {
				socket.emit('wifi status', '<h4 style="color:red;">Error: ' + stderr + '</h1>');
			} else {
				if (stdout.indexOf("DISCONNECTED") > -1) {
					socket.emit('wifi status', '<h4 style="color:red;">Disconnected</h1>');
				} else if (stdout.indexOf("SCANNING") > -1) {
					socket.emit('wifi status', '<h4 style="color:red;">Scanning</h1>');
				} else if (stdout.indexOf("INACTIVE") > -1) {
					socket.emit('wifi status', '<h4 style="color:red;">Inactive</h1>');
				} else {
					var fields = stdout.split("\n");
					for (var i in fields) {
						line = fields[i].split("=");
						if (line[0] == "ssid") {
							var ssid = line[1];
						}
					}
					
					if (stdout.indexOf("HANDSHAKE") > -1) {
						socket.emit('wifi status', '<h4>Connecting: ' + ssid + '</h1>');
					} else {
						socket.emit('wifi status', '<h4 style="color:green;">Connected: ' + ssid + '</h1>');
					}
				}
			}
		});
	});
});

function updateInternetStatus(should_log) {
	var cmd = child_process.exec('ping -c1 google.com', function (error, stdout, stderr) {
		if (should_log) {
			logger.log("ping -c1 google.com : ", error + stdout + stderr);
		}
		if (error) {
			_internet_connected = false;
		} else {
			_internet_connected = true;
		}
		io.emit('internet status', _internet_connected);
	});
}

updateInternetStatus(true);
setInterval(updateInternetStatus, 2500, false);

// get cpu & ram usage
function updateCPUStats () {
	var cpu_stats = {};

	// report cpu usage stats (divide load by # of cpus to get load)
	cpu_stats.cpu_load	= os.loadavg()[0]/os.cpus().length*100;	 // %

	// report ram stats (raspbian uses 1024 B = 1 KB)
	cpu_stats.ram_free	= os.freemem()/(1024*1024);	 // MB
	cpu_stats.ram_total = os.totalmem()/(1024*1024); // MB
	cpu_stats.ram_used	= cpu_stats.ram_total - cpu_stats.ram_free; // MB

	cpu_stats.cpu_status    = ""
	// Get cpu status
	getCpuStatus(function(status) {
		throttled = status.split("=");

		// If command fail, return no status
		if (throttled[0] != "throttled") {
			cpu_stats.cpu_status = "No status"
			io.emit('cpu stats', cpu_stats);
			return;
		}

		// Decode command
		throttled_code = parseInt(throttled[1])
		var throttled_list =
		[
			{bit: 18, type: "Throttling has occurred"},
			{bit: 17, type: "Arm frequency capped has occurred"},
			{bit: 16, type: "Under-voltage has occurred"},
			{bit: 2, type: "Currently throttled"},
			{bit: 1, type: "Currently arm frequency capped"},
			{bit: 0, type: "Currently under-voltage"}
		];

		for (i = 0; i < throttled_list.length; i++) {
			if ((throttled_code >> throttled_list[i].bit) & 1) {
				if (cpu_stats.cpu_status != "") {
					cpu_stats.cpu_status += ", "
				}
				cpu_stats.cpu_status += throttled_list[i].type
			}
		}

		// stream collected data
		io.emit('cpu stats', cpu_stats);
	})
}

function getCpuStatus(callback) {
	var cmd = child_process.exec('vcgencmd get_throttled', function (error, stdout, stderr) {
		callback(stdout);
	});
}

// Make updateCPUStats() run once every 5 seconds (=os.loadavg() update rate)
setInterval(updateCPUStats, 5000);

io.on('connection', function(socket) {

	// used in routing setup
	socket.on('get serial ids', function(data) {
		logger.log("get serial ids");
		var cmd = child_process.exec('ls /dev/serial/by-id/*', function (error, stdout, stderr) {
			logger.log("ls /dev/serial/by-id/* : ", error + stdout + stderr);
			socket.emit('serial ids', stdout);
		});
	});
	
	
	// used in routing setup
	socket.on('routing request', function(data) {
		logger.log("routing request");
		var sock = dgram.createSocket('udp4');
		var message = new Buffer(JSON.stringify(data));
		sock.send(message, 0, message.length, 18990, '0.0.0.0', function(err, bytes) {
			if (err) {
				logger.error(err);
				throw err;
			}
		});
		
		sock.on('message', (msg, rinfo) => {
			socket.emit('endpoints', msg.toString());
		});

	});
	
	
	// system setup
	socket.on('get companion version', function(data) {
		logger.log('get companion version');
		var cmd = child_process.exec('git describe --tags', function(error, stdout, stderr) {
			logger.log(error + stdout + stderr);
			socket.emit('companion version', stdout + stderr);
		});
	});
	
	
	// system setup
	socket.on('get companion latest', function(data) {
		logger.log("get companion latest");
		var cmd = child_process.exec('git tag -d stable >/dev/null; git fetch --tags >/dev/null; git rev-list --left-right --count HEAD...refs/tags/stable | cut -f2', function(error, stdout, stderr) {
			logger.log(error + stdout + stderr);
			if (parseInt(stdout) > 0) {
				socket.emit('companion latest');
			}
		});
	});
	
	
	// system setup
	socket.on('update companion', function(data) {
		logger.log("update companion");
		var cmd;
		if (data) {
			logger.log('from file', data);
			cmd = child_process.spawn(_companion_directory + '/scripts/sideload.sh', ['/tmp/data/' + data], {
				detached: true
			});	
		} else {
			var args = ['origin', '', 'stable', 'true']; // remote, branch, tag, copy repo for revert?
			cmd = child_process.spawn(_companion_directory + '/scripts/update.sh', args, {
				detached: true
			});
		}
		
		// Ignore parent exit, we will restart this application after updating
		cmd.unref();
		
		cmd.stdout.on('data', function (data) {
			logger.log(data.toString());
			socket.emit('terminal output', data.toString());
			if (data.indexOf("Update Complete, refresh your browser") > -1) {
				socket.emit('companion update complete');
			}
		});
		
		cmd.stderr.on('data', function (data) {
			logger.error(data.toString());
			socket.emit('terminal output', data.toString());
		});
		
		cmd.on('exit', function (code) {
			logger.log('companion update exited with code ' + code.toString());
			socket.emit('companion update complete');
		});
		
		cmd.on('error', (err) => {
			logger.error('companion update errored: ', err.toString());
		});
	});
	
	
	// system setup
	socket.on('update pixhawk', function(data) {
		logger.log("update pixhawk");
		if (data.option == 'dev') {
			// Use spawn instead of exec to get callbacks for each line of stderr, stdout
			var cmd = child_process.spawn(_companion_directory + '/tools/flash_px4.py', ['--latest']);
		} else if (data.option == 'beta') {
			var cmd = child_process.spawn(_companion_directory + '/tools/flash_px4.py', ['--url', 'http://firmware.ardupilot.org/Sub/beta/PX4/ArduSub-v2.px4']);
		} else if (data.option == 'file') {
			var cmd = child_process.spawn(_companion_directory + '/tools/flash_px4.py', ['--file', '/tmp/data/' + data.file]);
		} else {
			var cmd = child_process.spawn(_companion_directory + '/tools/flash_px4.py');
		}
		
		cmd.stdout.on('data', function (data) {
			socket.emit('terminal output', data.toString());
			logger.log(data.toString());
		});
		
		cmd.stderr.on('data', function (data) {
			socket.emit('terminal output', data.toString());
			logger.log(data.toString());
		});
		
		cmd.on('exit', function (code) {
			logger.log('pixhawk update exited with code ' + code.toString());
			socket.emit('pixhawk update complete');
		});

		cmd.on('error', (err) => {
			logger.log('Failed to start child process.');
			logger.log(err.toString() + '\n');
		});
	});

	// Restore pixhawk factory firmware
	socket.on('restore px fw', function(data) {
		logger.log("restore px fw");
		var cmd = child_process.spawn('/usr/bin/python', ['-u',
			_companion_directory + '/tools/flash_px4.py',
			'--file', _companion_directory + '/fw/ArduSub-v2.px4']);

		cmd.stdout.on('data', function (data) {
			socket.emit('terminal output', data.toString());
			logger.log(data.toString());
		});

		cmd.stderr.on('data', function (data) {
			socket.emit('terminal output', data.toString());
			logger.log(data.toString());
		});

		cmd.on('exit', function (code) {
			logger.log('pixhawk firmware restore exited with code '
				+ code.toString());
			socket.emit('restore px fw complete');
		});

		cmd.on('error', (err) => {
			logger.log('Failed to start child process.');
			logger.log(err.toString());
			socket.emit('terminal output', err.toString() + '\n');
			socket.emit('restore px fw complete');
		});
	});

	// Restore pixhawk factory parameters
	socket.on('restore px params', function(data) {
		logger.log("restore px params");
		var cmd = child_process.spawn('/usr/bin/python', ['-u',
			_companion_directory + '/tools/flashPXParameters.py',
			'--file', _companion_directory + '/fw/standard.params']);

		cmd.stdout.on('data', function (data) {
			socket.emit('terminal output', data.toString());
			logger.log(data.toString());
		});

		cmd.stderr.on('data', function (data) {
			socket.emit('terminal output', data.toString());
			logger.log(data.toString());
		});

		cmd.on('exit', function (code) {
			logger.log('pixhawk parameters restore exited with code '
				+ code.toString());
			socket.emit('restore px params complete');
		});

		cmd.on('error', (err) => {
			logger.log('Failed to start child process.');
			logger.log(err.toString());
			socket.emit('terminal output', err.toString());
			socket.emit('restore px params complete');
		});
	});

	socket.on('save params', function(data) {
		var file_path = "/home/pi/" + data.file
		fs.writeFile(file_path, data.params, function(err) {
			if(err) {
				return console.log(err);
			}
			console.log("The file was saved!");
		});
	});

	socket.on('reboot px', function(data) {
		var bash = "`timeout 5 mavproxy.py --master=/dev/serial/by-id/usb-3D_Robotics_PX4_FMU_v2.x_0-if00 --cmd=\"reboot;\"`&"
		child_process.exec(bash);
		socket.emit('reboot px complete');
	});

	socket.on('load params', function(data) {
		var file_path = "/home/pi/" + data.file;
		fs.readFile(file_path, function(err, param_data) {
			if(err) {
				return console.log(err);
			}

			socket.emit('load params response', {
				'params':param_data.toString(),
				'file':data.file
			});
			console.log("The file was loaded!");
		});
	});

	socket.on('restart video', function(data) {
		logger.log(_companion_directory + '/scripts/restart-raspivid.sh "' + data.rpiOptions + '" "' + data.gstOptions + '"');
		var cmd = child_process.spawn(_companion_directory + '/scripts/restart-raspivid.sh', [data.rpiOptions , data.gstOptions], {
			detached: true
		});
		
		cmd.unref();
		
		cmd.stdout.on('data', function (data) {
			logger.log(data.toString());
		});
		
		cmd.stderr.on('data', function (data) {
			logger.log(data.toString());
		});
		
		cmd.on('exit', function (code) {
			logger.log('pixhawk update exited with code ' + code.toString());
			socket.emit('video up');
		});
		
		cmd.on('error', (err) => {
			logger.log('Failed to start child process.');
			logger.log(err.toString());
		});	
	});

	socket.on('set password', function(data) {
		logger.log('Updating Password');
		var user	= 'pi';
		var cmd = child_process.spawn('sudo',
            [_companion_directory + '/tools/set-password.py', '--user=' + user,
            '--oldpass=' + data.oldpass, '--newpass=' + data.newpass], {
			detached: true
		});

		cmd.unref();

		cmd.stdout.on('data', function (data) {
			logger.log(data.toString());
		});

		cmd.stderr.on('data', function (data) {
			logger.log(data.toString());
		});

		cmd.on('exit', function (code) {
			logger.log('password set exited with code ' + code.toString());
			socket.emit('set password response', code.toString());
		});

		cmd.on('error', (err) => {
			logger.log('Failed to start child process.');
			logger.log(err.toString());
		});
	});

	socket.on('start WL driver', function(data) {
		var args = '';
		if (data.ip) {
			args += ' --ip=' + data.ip;
		}
		if (data.port) {
			args += ' --port=' + data.port;
		}
		var cmd = child_process.exec('screen -dm -S wldriver ' + _companion_directory + '/tools/underwater-gps.py' + args, function(error, stdout, stderr) {
			logger.log('Start waterlinked driver:', error, stdout, stderr);
		});
	});
	
	socket.on('stop WL driver', function(data) {
		var cmd = child_process.exec('screen -X -S wldriver quit', function(error, stdout, stderr) {
			logger.log('Stop waterlinked driver:', error, stdout, stderr);
		});
	});
	
	socket.on('reboot', function(data) {
		logger.log('reboot');
		child_process.exec('sudo reboot now', function (error, stdout, stderr) {
			logger.log(stdout + stderr);
		});
	});
	
	socket.on('shutdown', function(data) {
		logger.log('shutdown');
		child_process.exec('sudo shutdown -h now', function (error, stdout, stderr) {
			logger.log(stdout + stderr);
		});
	});
	
	var uploader = new SocketIOFile(socket, {
		// uploadDir: {			// multiple directories 
		// 	music: 'data/music', 
		// 	document: 'data/document' 
		// },
		uploadDir: '/tmp/data',	// simple directory 
		chunkSize: 10240,		// default is 10240(1KB) 
		transmissionDelay: 0,	// delay of each transmission, higher value saves more cpu resources, lower upload speed. default is 0(no delay) 
		overwrite: true 		// overwrite file if exists, default is true. 
	});
	uploader.on('start', (fileInfo) => {
		logger.log('Start uploading');
		logger.log(fileInfo);
	});
	uploader.on('stream', (fileInfo) => {
		logger.log(`${fileInfo.wrote} / ${fileInfo.size} byte(s)`);
	});
	uploader.on('complete', (fileInfo) => {
		logger.log('Upload Complete.');
		logger.log(fileInfo);
	});
	uploader.on('error', (err) => {
		logger.log('Error!', err);
	});
	uploader.on('abort', (fileInfo) => {
		logger.log('Aborted: ', fileInfo);
	});
});
