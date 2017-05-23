var express = require('express');
var app = express();
const child_process = require('child_process');
const dgram = require('dgram');
const SocketIOFile = require('socket.io-file');
var logger = require('tracer').console();

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

////////////////// Routes

// root
app.get('/', function(req, res) {
	res.render('index',{})
});

app.get('/routing', function(req, res) {
	res.render('routing',{})
});

app.get('/system', function(req, res) {
	res.render('system',{})
});

app.get('/socket.io-file-client.js', (req, res, next) => {
	return res.sendFile(__dirname + '/node_modules/socket.io-file-client/socket.io-file-client.js');
});

var server = app.listen(2770, function() {
	var host = server.address().address;
	var port = server.address().port;
	logger.log("App running at http://%s:%s", host, port);
});

var io = require('socket.io')(server);
var networking = io.of('/networking');

networking.on('connection', function(socket) {
	
	// Network setup
	socket.on('join network', function(data) {
		logger.log('join network');
		
		try {
			var passphrase = child_process.execSync("wpa_passphrase " + data.ssid + " " + data.password);
			
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
	
	
	// Query internet connectivity
	socket.on('get internet status', function() {
		logger.log("get internet status")
		var cmd = child_process.exec('ping -c1 google.com', function (error, stdout, stderr) {
			logger.log("ping -c1 google.com : ", error + stdout + stderr);
			if (error) {
				socket.emit('internet status', '<h4 style="color:red;">Not Connected</h1>');
			} else {
				socket.emit('internet status', '<h4 style="color:green;">Connected</h1>');
			}
		})
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
			cmd = child_process.spawn('/home/pi/companion/scripts/sideload.sh', ['/tmp/data/' + data], {
				detached: true
			});	
		} else {
			cmd = child_process.spawn('/home/pi/companion/scripts/update.sh', {
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
			var cmd = child_process.spawn('/home/pi/companion/tools/flash_px4.py', ['--latest']);
		} else if (data.option == 'beta') {
			var cmd = child_process.spawn('/home/pi/companion/tools/flash_px4.py', ['--url', 'http://firmware.us.ardupilot.org/Sub/beta/PX4/ArduSub-v2.px4']);
		} else if (data.option == 'file') {
			var cmd = child_process.spawn('/home/pi/companion/tools/flash_px4.py', ['--file', '/tmp/data/' + data.file]);
		} else {
			var cmd = child_process.spawn('/home/pi/companion/tools/flash_px4.py');
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
			logger.log(err.toString());
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
