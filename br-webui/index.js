var express = require('express');
var app = express();
const child_process = require('child_process');
const dgram = require('dgram');

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

var server = app.listen(2770, function() {
	var host = server.address().address;
	var port = server.address().port;
	console.log("App running at http://%s:%s", host, port);
});

var io = require('socket.io')(server);
var networking = io.of('/networking');

networking.on('connection', function(socket) {
	
	// Network setup
	socket.on('join network', joinNetwork);
	
	
	// Network setup
	socket.on('get wifi aps', function() {
		console.log("SCAN Networks");
		
		try {
			var cmd = child_process.execSync('sudo wpa_cli scan');
			// For some reason this fails once in a while
			cmd = child_process.execSync('sudo wpa_cli scan_results | grep PSK | cut -f5 | grep .');
			socket.emit('wifi aps', cmd.toString().trim().split("\n"));
		} catch (e) {
			console.log("\n\nCAUGHT ERROR:");
			console.log(e);
			return "";
		}
		
	});
	
	
	// Query internet connectivity
	socket.on('get internet status', function() {
		console.log("GET INTERNET STATUS")
		var cmd = child_process.exec('ping -c1 google.com', function (error, stdout, stderr) {
			if (error) {
				socket.emit('internet status', '<h4 style="color:red;">Not Connected</h1>');
			} else {
				socket.emit('internet status', '<h4 style="color:green;">Connected</h1>');
			}
		})
	});
	
	
	socket.on('get wifi status', function() {
		var cmd = child_process.exec('sudo wpa_cli status', function (error, stdout, stderr) {
			console.log("WIFI STATUS");
			//console.log(stdout + stderr);
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
	
	
	//Restart wifi interface/wpa_supplicant
	function restart_network(error, stdout, stderr) {
		console.log(error + stdout + stderr);
		var cmd = child_process.exec('sudo ifdown wlan0 && sudo ifup wlan0', function (error, stdout, stderr) {
			console.log("NETWORK RESTART");
			console.log(error + stdout + stderr);
		});
	}
	
	
	function joinNetwork(data) {
		console.log(data);
		
		try {
			var passphrase = child_process.execSync("wpa_passphrase " + data.ssid + " " + data.password);
			
			var networkString = passphrase.toString();
			networkString = networkString.replace(/\t#.*\n/g, ''); // strip unencrypted password out
			networkString = networkString.replace(/"/g, '\\"'); // escape quotes
			
			// Restart the network in the callback
			cmd = child_process.exec("sudo sh -c \"echo '" + networkString + "' > /etc/wpa_supplicant/wpa_supplicant.conf\"", restart_network); 
		} catch (e) {
			console.log("CAUGHT ERROR: ");
			console.log(e);
		}
	}
});


io.on('connection', function(socket) {

	// used in routing setup
	socket.on('get serial ids', function(data) {
		var cmd = child_process.exec('ls /dev/serial/by-id/*', function (error, stdout, stderr) {
			socket.emit('serial ids', stdout);
		});
	});
	
	
	// used in routing setup
	socket.on('routing request', function(data) {
		var sock = dgram.createSocket('udp4');
		console.log("ROUTING REQUEST");
		var message = new Buffer(JSON.stringify(data));
		sock.send(message, 0, message.length, 18990, '0.0.0.0', function(err, bytes) {
			if (err) {
				console.log("ERROR");
				throw err;
			}
		});
		
		sock.on('message', (msg, rinfo) => {
			socket.emit('endpoints', msg.toString());
		});

	});
	
	
	// used in system setup
	socket.on('get companion refs', function(data) {
		var cmd = child_process.exec('git ls-remote --tags origin | cut -f2 | cut -f3 -d /', function (error, stdout, stderr) {
			socket.emit('companion refs', stdout + stderr);
		});
	});
	
	
	socket.on('get companion version', function(data) {
		var cmd = child_process.exec('git describe --tags', function( error, stdout, stderr) {
			socket.emit('companion version', stdout + stderr);
		});
	});
	
	
	// system setup
	socket.on('update companion', function(data) {
		updateCompanion(data);
	});
	
	
	// system setup
	socket.on('update pixhawk', function(data) {
		if (data.option == 'dev') {
			// Use spawn instead of exec to get callbacks for each line of stderr, stdout
			var cmd = child_process.spawn('/home/pi/companion/tools/flash_px4.py', ['--latest']);
		} else if (data.option == 'beta') {
			var cmd = child_process.spawn('/home/pi/companion/tools/flash_px4.py', ['--url', 'http://firmware.us.ardupilot.org/Sub/beta/PX4/ArduSub-v2.px4']);
		} else {
			var cmd = child_process.spawn('/home/pi/companion/tools/flash_px4.py');
		}
		
		cmd.stdout.on('data', function (data) {
			socket.emit('terminal output', data.toString());
		});
		
		cmd.stderr.on('data', function (data) {
			socket.emit('terminal output', data.toString());
		});
		
		cmd.on('exit', function (code) {
			console.log('companion update exited with code ' + code.toString());
		});
		
		cmd.on('error', (err) => {
			console.log('Failed to start child process.');
			console.log(err);
		});	
	});
	
	socket.on('reboot', function(data) {
		console.log('REBOOT');
		child_process.exec('sudo reboot now', function (error, stdout, stderr) {
			console.log(stdout + stderr);
		});
	});
	
	socket.on('shutdown', function(data) {
		console.log('SHUTDOWN');
		child_process.exec('sudo shutdown -h now', function (error, stdout, stderr) {
			console.log(stdout + stderr);
		});
	});
	
	
	function updateCompanion(tag) {
		var cmd = child_process.exec('cd /home/pi/companion && git fetch && git checkout ' + tag, function (error, stdout, stderr) {
			console.log("COMPANION UPDATE");
			console.log(tag);
			console.log(error);
			console.log(stdout + stderr);
			socket.emit('terminal output', stdout + stderr);
		});
	}
});
