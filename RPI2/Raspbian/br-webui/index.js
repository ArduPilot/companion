var express = require('express');
var app = express();
const child_process = require('child_process');

app.use(express.static('public'));

function getNetworks() {
	console.log("SCAN Networks");
	
	try {
		var cmd = child_process.execSync('sudo wpa_cli scan');
		// For some reason this fails once in a while
		cmd = child_process.execSync('sudo wpa_cli scan_results | grep PSK | cut -f5 | grep .');
	} catch (e) {
		console.log("\n\nCAUGHT ERROR:");
		console.log(e);
		return "";
	}
	
	return cmd.toString().trim().split("\n");
}

////////////////// Routes

// root
app.get('/', function (req, res) {
	res.sendFile(__dirname + "/index.html");
})

app.get('/reboot', function (req, res) {
	res.redirect('/');
	child_process.exec('sleep 2 && sudo reboot now');
});

app.get('/shutdown', function (req, res) {
	res.redirect('/');
	child_process.exec('sleep 2 && sudo shutdown -h now');
});

app.get('/routing', function (req, res) {
	res.sendFile(__dirname + "/routing.html");
});

app.get('/system', function (req, res) {
	res.sendFile(__dirname + '/system.html');
});

var server = app.listen(2770, function () {
	var host = server.address().address
	var port = server.address().port
	console.log("App running at http://%s:%s", host, port)
});

var io = require('socket.io')(server);

io.on('connection', function (socket) {
	socket.on('get serial ids', function (data) {
		var cmd = child_process.exec('ls /dev/tty*', function (error, stdout, stderr) {
			socket.emit('serial ids', stdout + stderr);
		});
	});
	
	socket.on('get companion refs', function (data) {
		var cmd = child_process.exec('git tag', function (error, stdout, stderr) {
			socket.emit('companion refs', stdout + stderr);
		});
	});
	
	socket.on('join network', joinNetwork);
	
	socket.on('update companion', function(data) {
		updateCompanion(data);
	});
	
	socket.on('update pixhawk', updatePixhawk);
	
	socket.emit('wifi aps', getNetworks());
	setInterval( function () {
		socket.emit('wifi aps', getNetworks());
	}, 5000);
	
	getInternetStatus();
	setInterval( function () {
		getInternetStatus();
	}, 3000);
	
	getWiFiStatus();
	setInterval( function () {
		getWiFiStatus();
	}, 3000);
	
	// Query internet connectivity
	function getInternetStatus() {
		var cmd = child_process.exec('ping -c1 google.com', function (error, stdout, stderr) {
			if (error) {
				socket.emit('internet status', '<h4 style="color:red;">Not Connected</h1>');
			} else {
				socket.emit('internet status', '<h4 style="color:green;">Connected</h1>');
			}
		})
	}
	
	function getWiFiStatus() {
		var cmd = child_process.exec('sudo wpa_cli status', function (error, stdout, stderr) {
			console.log("WIFI STATUS");
			console.log(stdout + stderr);
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
	}
	
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
			networkString = networkString.replace(/"/g, '\\"'); // strip unencrypted password out
			
			// Restart the network in the callback
			cmd = child_process.exec("sudo sh -c \"echo '" + networkString + "' > /etc/wpa_supplicant/wpa_supplicant.conf\"", restart_network); 
		} catch (e) {
			console.log("CAUGHT ERROR: ");
			console.log(e);
		}
	}
	
	function updateCompanion(tag) {
		var cmd = child_process.exec('cd /home/pi/companion && git pull -f', function (error, stdout, stderr) {
			console.log("COMPANION UPDATE");
			console.log(tag);
			console.log(error);
			console.log(stdout + stderr);
			socket.emit('terminal output', stdout + stderr);
		})
	}
	
	function updatePixhawk() {
		// Use spawn instead of exec to get callbacks for each line of stderr, stdout
		var cmd = child_process.spawn('/home/pi/companion/RPI2/Raspbian/flash_px4.py', ['--latest']);
		
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
	}
})
