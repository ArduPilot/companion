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
app.use('/js', express.static(__dirname + '/node_modules/network-js/dist'));
app.use('/js', express.static(__dirname + '/node_modules/bootstrap-switch/dist/js'));
app.use('/css', express.static(__dirname + '/node_modules/bootstrap-switch/dist/css/bootstrap2'));
app.use('/js', express.static(__dirname + '/node_modules/bootstrap-select/dist/js'));
app.use('/css', express.static(__dirname + '/node_modules/bootstrap-select/dist/css'));
app.use('/js', express.static(__dirname + '/node_modules/bootstrap-slider/dist'));
app.use('/css', express.static(__dirname + '/node_modules/bootstrap-slider/dist/css'));

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

var v4l2camera = require("v4l2camera");
// This holds all of the cameras/settings detected at start, and that are currently in use, we need to update this every time we modify the camera setttings
var _cameras = []


//This holds the current frame size, frame rate, video device, and video format
//These settings are passed to the video streaming application, and are used by
//gstreamer v4l2src element. The v4l2src element needs to call the appropriate ioctls,
//so we don't do that in this application.
var _activeFormat

try {
	var file_path = "/home/pi/vidformat.param";
	var file_data = fs.readFileSync(file_path).toString();
	var fields = file_data.split("\n");
	_activeFormat = { "frameSize": fields[0] + "x" + fields[1], "frameRate": fields[2], "device": fields[3], "format": "H264" }
} catch (err) {
	logger.log("error loading video format from file", err);
}

// This holds the user created camera/streaming profiles
var _profiles = {};

// Load saved user camera/streaming profiles
try {
	var file_path = "/home/pi/camera-profiles";
	_profiles = JSON.parse(fs.readFileSync(file_path).toString());
	logger.log("loading profiles from file", _profiles);
} catch (err) {
	logger.log("error loading video profiles from file", err);
}

//This holds all of the last used/known settings from previous run
var old_cameras = []
const camera_settings_path = "/home/pi/camera-settings"
// Load the last known camera settings
try {
	var file_data = fs.readFileSync(camera_settings_path);
	old_cameras = JSON.parse(file_data.toString());
} catch (err) {
	logger.log("error loading file", err);
}

// Create camera objects, set all camera settings on all cameras to the
// last known settings
for (var i = 0; ;i++) {
	try {
		var cam = new v4l2camera.Camera("/dev/video" + i)
		logger.log("found camera:", i);
		
		// TODO put this in driver layer
		cam.controls.forEach(function(control) {
			if (control.type != "class") {
				control.value = cam.controlGet(control.id); // store all the current values locally so that we can update the frontend
				logger.log("getting control:", control.name, control.type, control.value);
				// HACK, some v4l2 devices report bogus default values that are way beyond
				// min/max range, so we need to record what the default value actually is
				// The cameras that I have seen 
				control.default = control.value;
				
				// HACK, bogus max on rpi cam
				if (control.name == "H264 I-Frame Period" && control.max > 2000000) {
					control.max = 120;
				}
			}
		});
		
		var has_h264 = false;
		cam.formats.forEach(function(format) {
			if (format.formatName == "H264") {
				has_h264 = true;
			}
		});
		
		if (has_h264) {
			_cameras.push(cam);
		}
	} catch(err) { // this is thrown once /dev/video<i> does not exist, we have enumerated all of the cameras
		old_cameras.forEach(function(oldcam) { // Configure cameras to match last known/used settings
			_cameras.forEach(function(cam) {
				if (cam.device == oldcam.device) {
					logger.log("oldcam match:", oldcam.device);
					oldcam.controls.forEach(function(control) {
						logger.log("setting control:", control.name, control.value);
						try {
							cam.controlSet(control.id, control.value);
						} catch (err) {
							logger.log("control set failed");
						}
					});
				}
			});
		});
		break;
	}
}


////////////////// Routes

// root
app.get('/', function(req, res) {
	res.redirect('/network');
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

app.get('/mavproxy', function(req, res) {
	res.render('mavproxy', {});
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

app.get('/vlc.sdp', function (req, res) {
  var file = __dirname + '/files/vlc.sdp';
  res.download(file);
});

app.get('/test', function(req, res) {
	var module = req.query['module'];
	//console.log("Dealing with: ", module);

	// Match headers found @ https://github.com/nesk/network.js/blob/master/server/server.php
	res.set({
		// Make sure the connection closes after each request
		'Connection': 'close',
		// Don't let any caching happen
		'Cache-Control': 'no-cache, no-store, no-transform',
		'Pragma': 'no-cache',
		'Access-Control-Allow-Origin': '*',
	});
	
	if (module && module == 'download') {
		// It is way too slow to generate the response content in a for loop, it affects the measured bandwidth by a factor of 50+
		// Instead, just send this file
		res.sendFile(_companion_directory + '/tools/100MB.file');
		
		// Thank you https://github.com/nesk/network.js/pull/62
//		// Define a content size for the response, defaults to 20MB.
//		var contentSize = 100 * 1024 * 1024;
//		if (req.query['size'])
//		{
//			contentSize=parseInt(req.query['size']);
//			contentSize=Math.min(contentSize,200*1024*1024);
//		}
//
//		// Provide a base string which will be provided as a response to the client
//		var baseString='This text is so uncool, deal with it. ';
//		var baseLength=baseString.length;
//		// Output the string as much as necessary to reach the required size
//
//		for (var i = 0 ; i < Math.floor(contentSize / baseLength) ; i++) {
//			console.log(i)
//			if (res.finished) {
//				console.log("closed early!");
//				break;
//			}
//			res.write(baseString + i);
//		}
//		// If necessary, complete the response to fully reach the required size.
//		if (( lastBytes = contentSize % baseLength) > 0) 
//		{
//			res.end(baseString.substr(0,lastBytes));
//		}
	} else {
		res.send('OK');
	}
});

app.post('/test', function(req, res) {
	var module = req.query['module'];
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
//			'url' : https://github.com... ,
//			'authenticated : false,
//			'branches' : [],
//			'tags'     : []
//		},
//		
//		'origin' : {
//			'url' : https://github.com... ,
//			'authenticated : true,
//			'branches' : [],
//			'tags'     : []
//		}
//	}
//}

var _refs = { 'remotes' : {} };

var companionRepository = null;
Git.Repository.open(_companion_directory)
	.then(function(repository) {
		companionRepository = repository;
		updateCurrentHEAD(companionRepository);
		emitRemotes();
	})
	.catch(function(err) { logger.log(err); });

function updateCurrentHEAD(repository) {
	repository.head()
		.then(function(reference) {
			_current_HEAD = reference.target().tostrS().substring(0,8);
			io.emit('current HEAD', _current_HEAD);
			logger.log('Current HEAD:', reference.target().tostrS().substring(0,8));
		});
}

//Set up fetch options and credential callback
var fetchOptions = new Git.FetchOptions();
var remoteCallbacks = new Git.RemoteCallbacks();

// So there's this crazy thing where nodegit gets stuck in an infinite callback loop here if
// we return sshKeyFromAgent, and we do not actually have valid credentials stored in the agent.
// There is no public method to check if the credentials are valid before returning them.
// So we return sshKeyFromAgent the first time, and if we get called again immediately after with
// the same request, we assume it is the bug and return defaultNew to break the loop.
var requests = {};

remoteCallbacks.credentials = function(url, userName) {
	logger.log('credentials required', url, userName);
	var id = userName + "@" + url;
	
	if (requests[id]) {
		return Git.Cred.defaultNew();
	}
	requests[id] = true;
	setTimeout(function() {
		requests[id] = false;
		console.log(requests);
	}, 500);

	
	return Git.Cred.sshKeyFromAgent(userName);
}

fetchOptions.callbacks = remoteCallbacks;
fetchOptions.downloadTags = 1;

// Fetch and parse remote references, add them to our list
// Emit our list after each remote's references are parsed
function formatRemote(remoteName) {
	// Add new remote to our list
	var newRemote = {
			'url' : '',
			'branches' : [],
			'tags' : [],
			'authenticated' :  false
		}
	_refs.remotes[remoteName] = newRemote;
	
	return companionRepository.getRemote(remoteName)
		.then(function(remote) {
			newRemote.url = remote.url();
			logger.log('connecting to remote', remote.name(), remote.url());
			return remote.connect(Git.Enums.DIRECTION.FETCH, remoteCallbacks)
			.then(function(errorCode) {
				// Get a list of refs
				return remote.referenceList()
				.then(function(promiseArrayRemoteHead) {
					// Get the name of each ref, determine if it is a branch or tag
					// and add it to our list
					newRemote.authenticated = true;
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
				})
				.catch(function(err) { logger.log(err); });
			})
			.catch(function(err) {
				logger.log("Error connecting to remote", remote.name(), err); 
			});
		})
		.catch(function(err) { logger.log(err); });
}


// Fetch, format, emit the refs on each remote
function formatRemotes(remoteNames) {
	logger.log('formatRemotes', remoteNames);
	
	var promises = [];
	
	remoteNames.forEach(function(remote) {
		promises.push(formatRemote(remote));
	});
	
	// callback for when all async operations complete
	return Promise.all(promises)
	.then(function() {
		io.emit('refs', _refs);
	});
}


// Get all remote references, compile a formatted list, and update frontend
function emitRemotes() {
	if (companionRepository == null) {
		return;
	}
	
	_refs = { 'remotes' : {} };
	
	updateCurrentHEAD(companionRepository);
	
	companionRepository.getRemotes()
		.then(formatRemotes)
		.catch(function(err) { logger.log(err); });
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
	
	// Get credentials from frontend, authenticate and update
	socket.on('credentials', function(data) {
		logger.log("git credentials");
		
		console.log(_refs);
		console.log(data);
		if (!_refs.remotes[data.remote]) {
			logger.log("no matching ref", data.name);
			return;
		}
		if (_refs.remotes[data.remote].url.indexOf("ssh://git@github.com") > -1) {
			var cmd = _companion_directory + '/scripts/authenticate-github.sh ' + data.username + ' ' + data.password;
			child_process.exec(cmd, function(err, stdout, stderr) {
				logger.log('Authentication returned ' + err);
				logger.log('stdout:\n' + stdout);
				logger.log('stderr:\n' + stderr);
				emitRemotes();
			});
		}
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
	
	// Add a remote to the local repository
	socket.on('remove remote', function(data) {
		logger.log('remove remote', data);
		Git.Remote.delete(companionRepository, data)
			.then(function(result) {
				logger.log("remove remote result:", result);
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
						} else if (line[0] == "ip_address") {
							var ip = " (" + line[1] + ")";
						}
					}
					
					if (stdout.indexOf("HANDSHAKE") > -1) {
						socket.emit('wifi status', '<h4>Connecting: ' + ssid + '</h1>');
					} else {
						var ipString = ""
						if (ip != undefined) {
							ipString = ip
						}
						
						var ssidString = ""
						if (ssid != undefined) {
							ssidString = ssid
						}
						
						socket.emit('wifi status', '<h4 style="color:green;">Connected: ' + ssidString + ipString + '</h4>');
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
	
	socket.on('get v4l2 cameras', function(data) {
		logger.log("get v4l2 cameras");
		
		// Update current control values
		_cameras.forEach(function(cam) {
			// TODO put this in driver layer
			cam.controls.forEach(function(control) {
					if (control.type != "class") {
						logger.log("getting control:", control.name, control.type);
						control.value = cam.controlGet(control.id);
					}
			});
		});
		
		try {
			var file_path = "/home/pi/vidformat.param";
			var file_data = fs.readFileSync(file_path).toString();
			var fields = file_data.split("\n");
			
			_activeFormat = { "frameSize": fields[0] + "x" + fields[1], "frameRate": fields[2], "device": fields[3], "format": "H264" }
						
			socket.emit('v4l2 cameras', {
				"cameras": _cameras,
				"activeFormat": _activeFormat,
				"profiles": _profiles
			});
		} catch(err) {
			logger.log("error reading format file");
		}
	});
	
	socket.on('set v4l2 control', function(data) {
		logger.log('set v4l2 control:', data);
		_cameras.forEach(function(camera) {
			if (camera.device == data.device) {
				try {
					camera.controlSet(data.id, data.value); // set the control
					camera.controls.forEach(function(control) {
						if (control.id == data.id) {
							logger.log("found match");
							control.value = data.value; // update current value in use
						}
					});
					
					
					// Save current settings for reload on next boot					
					fs.writeFile(camera_settings_path, JSON.stringify(_cameras, null, 2), function(err) {
						if(err) {
							logger.log(err);
						}
						logger.log("The file was saved!", camera_settings_path);
					});
				} catch (err) {
					logger.log("error setting control", err);
				}
			}
		});
	});

	socket.on('delete v4l2 profile', function(data) {
		logger.log("delete v4l2 profile", data);
		
		_profiles[data] = undefined; // delete the profile
		
		// save updated profiles list to file
		logger.log("Writing profiles to file", _profiles);

		try {
			file_path = "/home/pi/camera-profiles";
			fs.writeFileSync(file_path, JSON.stringify(_profiles, null, 2));
		} catch (err) {
			logger.log("Error writing profile to file");
		}
		
		
		// Update frontend
		socket.emit('v4l2 cameras', {
			"cameras": _cameras,
			"activeFormat": _activeFormat,
			"profiles": _profiles
		});
	});
	
	socket.on('save v4l2 profile', function(data) {
		logger.log("save v4l2 profile");
		try {
			// Load gstreamer settings to use in this profile
			var file_path = "/home/pi/vidformat.param";
			var file_data = fs.readFileSync(file_path).toString();
			var fields = file_data.split("\n");
	
			var profile = { "width": fields[0], "height" : fields[1], "frameRate": fields[2], "device": fields[3], "format": "H264", "controls": {} }
			
			// Load v4l2 controls to use in this profile
			_cameras.forEach(function(camera) {
				if (camera.device == profile.device) {
					camera.controls.forEach(function(control) {
						if (control.type != "class") {
							logger.log("saving control", control.name, control.id);
							profile.controls[control.id] = { "name": control.name, "value": camera.controlGet(control.id) };
						}
					});
				}
			});
			
			// Save the profile
			_profiles[data] = profile;
			
			logger.log("Writing profiles to file", _profiles);
			
			file_path = "/home/pi/camera-profiles";
			fs.writeFileSync(file_path, JSON.stringify(_profiles, null, 2));
		} catch (err) {
			logger.log("Error writing profile to file");
		}
		
		// Update frontend
		socket.emit('v4l2 cameras', {
			"cameras": _cameras,
			"activeFormat": _activeFormat,
			"profiles": _profiles,
			"activeProfile": data
		});
	});
	
	
	socket.on('reset v4l2 defaults', function(data) {
		logger.log("reset v4l2 defaults", data);
		try {
			_cameras.forEach(function(cam) {
				if (cam.device == data) {
					// TODO put this in driver layer
					cam.controls.forEach(function(control) {
						if (control.type != "class") {
							try {
								logger.log("setting control to default", control.name, control.default);
								cam.controlSet(control.id, control.default);
								control.value = cam.controlGet(control.id);
							} catch (err) {
								logger.log(err);
							}
						}
					});
				}
			});
			
			// Read back current values
			_cameras.forEach(function(cam) {
				// TODO put this in driver layer
				cam.controls.forEach(function(control) {
					if (control.type != "class") {
						logger.log("getting control:", control.name, control.type);
						try {
							control.value = cam.controlGet(control.id);
						} catch(err) {
							logger.log("error getting control", err);
						}
					}
				});
			});
			
			// Save current settings
			fs.writeFile(camera_settings_path, JSON.stringify(_cameras, null, 2), function(err) {
				if(err) {
					logger.log(err);
				}
				logger.log("The file was saved!", camera_settings_path);
			});
		} catch (err) {
			logger.log("error resetting v4l2 defaults", err);
		}
		
		// Update frontend
		socket.emit('v4l2 cameras', {
			"cameras": _cameras,
			"activeFormat": _activeFormat,
			"profiles": _profiles
		});
	});
	
	/* a profile looks like this:
	profileName : {
		device : "/dev/video0",
		format : "H264",
		width : 1920,
		height : 1080,
		frameRate : 30,
		controls : {
			101: {
				name: Brightness,
				value: 50
			},
			102: {
				name: Hue,
				value: 50
			}
		}
	}
	*/
	socket.on('load v4l2 profile', function(data) {
		logger.log("load v4l2 profile", data);
		
		var profile = _profiles[data];
		
		if (!profile) {
			logger.log("profile doesn't exist!", data);
			return;
		}
		
		try {
			////// Set format, restart camera ////////
			_cameras.forEach(function(camera) {
				if (camera.device == profile.device) {
					camera.activeFormat = { 
							"format": profile.format,
							"width": profile.width,
							"height": profile.height,
							"denominator": profile.frameRate
					}
					
				}
			})
			
			logger.log(_companion_directory + '/scripts/start_video.sh' + ' ' + profile.width + ' ' + profile.height + ' ' + profile.frameRate + ' ' + profile.device);
			
			var cmd = child_process.spawn(_companion_directory + '/scripts/start_video.sh', [profile.width, profile.height, profile.frameRate, profile.device], {
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
				logger.log('start video exited with code ' + code.toString());
				try {
					////// Set v4l2 controls //////
					_cameras.forEach(function(camera) {
						if (camera.device == profile.device) {
							for (var control in profile.controls) {
								try {
									logger.log("setting control", profile.controls[control].name, profile.controls[control].value);
									camera.controlSet(control, profile.controls[control].value);
									camera.controls.forEach(function(ctrl) {
										if (ctrl.id == control.id) {
											ctrl.value = profile.controls[control].value;
										}
									});
								} catch (err) {
									logger.log("error setting control", err);
								}
							}
						}
					});
					
					// Read back current values
					_cameras.forEach(function(cam) {
						// TODO put this in driver layer
						cam.controls.forEach(function(control) {
							if (control.type != "class") {
								logger.log("getting control:", control.name, control.type);
								try {
									control.value = cam.controlGet(control.id);
								} catch(err) {
									logger.log("error getting control", err);
								}
							}
						});
					});
					
					// Save current settings
					fs.writeFile(camera_settings_path, JSON.stringify(_cameras, null, 2), function(err) {
						if(err) {
							logger.log(err);
						}
						logger.log("The file was saved!", camera_settings_path);
					});
				} catch (err) {
					logger.log("Error setting v4l2 controls:", err);
				}
				
				try {
					////// Update frontend //////
					// Re-load file/activeFormat
					var file_path = "/home/pi/vidformat.param";
					var file_data = fs.readFileSync(file_path).toString();
					var fields = file_data.split("\n");
					
					_activeFormat = { "frameSize": fields[0] + "x" + fields[1], "frameRate": fields[2], "device": fields[3], "format": "H264" }
					
					logger.log("updating frontend", _activeFormat);
					socket.emit('v4l2 cameras', {
						"cameras": _cameras,
						"activeFormat": _activeFormat,
						"profiles": _profiles,
						"activeProfile": data
					});
					
					socket.emit('video up');
				} catch (err) {
					logger.log("error updating frontend", err);
				}
			});
			
			cmd.on('error', (err) => {
				logger.log('Failed to start video child process.');
				logger.log(err.toString());
			});
			
		} catch(err) {
			logger.log("Error setting v4l2 format:", err);
		}
	});
	
	
	// Set v4l2 streaming parameters
	// This requires the video streaming application to be restarted
	// The video streaming application needs to call the appropriate v4l2 ioctls, so we don't do it here
	socket.on('set v4l2 format', function(data) {
		try {
			logger.log('set v4l2 format', data);
			
			_cameras.forEach(function(camera) {
				if (camera.device == data.id) {
					camera.activeFormat = { 
							"format": data.format,
							"width": data.width,
							"height": data.height,
							"denominator": data.interval.denominator
					}
					
				}
			})
			
			_activeFormat = { "frameSize": data.width + "x" + data.height, "frameRate": data.interval.denominator, "device": data.id, "format": "H264" }
			
			logger.log(_companion_directory + '/scripts/start_video.sh' + ' ' + data.width + ' ' + data.height + ' ' + data.interval.denominator + ' ' + data.id);
			
			var cmd = child_process.spawn(_companion_directory + '/scripts/start_video.sh', [data.width, data.height, data.interval.denominator, data.id], {
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
				logger.log('start video exited with code ' + code.toString());
				socket.emit('video up');
			});
			
			cmd.on('error', (err) => {
				logger.log('Failed to start video child process.');
				logger.log(err.toString());
			});
			
			// Save current settings
			fs.writeFile(camera_settings_path, JSON.stringify(_cameras, null, 2), function(err) {
				if(err) {
					logger.log(err);
				}
				logger.log("The file was saved!", camera_settings_path);
			});
			
		} catch(err) {
			logger.log("Error setting v4l2 format:", err);
		}
	});
	
	socket.on('update gstreamer', function(data) {
		logger.log("update gstreamer");
		var params = data;
		try {
			if (!params) {
				params = fs.readFileSync(_companion_directory + "/params/gstreamer2.param.default");
			}
			
			var file_path = "/home/pi/gstreamer2.param";
			fs.writeFileSync(file_path, params);
			
			var cmd = child_process.spawn(_companion_directory + '/scripts/start_video.sh', {
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
				logger.log('start video exited with code ' + code.toString());
				socket.emit('video up');
			});
			
			cmd.on('error', (err) => {
				logger.log('Failed to start video child process.');
				logger.log(err.toString());
			});
			
		} catch(err) {
			logger.log("Error updating gstreamer pipeline:", err);
		}
	});
	
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
				logger.log(err);
				return;
			}
			socket.emit('save params response', {'file':data.file});
			logger.log("The file was saved!");
		});
	});

	socket.on('reboot px', function(data) {
		var bash = "`timeout 5 mavproxy.py --master=/dev/serial/by-id/usb-3D_Robotics_PX4_FMU_v2.x_0-if00 --cmd=\"reboot;\"`&"
		child_process.exec(bash);
		socket.emit('reboot px complete');
	});

	socket.on('load params', function(data) {
		var user_file_path    = "/home/pi/" + data.file;
		var default_file_path = _companion_directory + "/params/" +  data.file + ".default";
		// Check if the user param file exists, use default file if it doesn't
		fs.stat(user_file_path, function(err, stat) {
			var file_path = (err == null) ? user_file_path : default_file_path;
			fs.readFile(file_path, function(err, param_data) {
				if(err) {
					logger.log(err);
					return;
				}

				socket.emit('load params response', {
					'params':param_data.toString(),
					'file':data.file
				});
				logger.log("The file was loaded!");
			});
		});
	});

	socket.on('delete params', function(data) {
		var user_file_path    = "/home/pi/" + data.file;
		// Check if the user param file exists, delete it if it does
		fs.stat(user_file_path, function(err, stat) {
			if (err == null) {
				fs.unlink(user_file_path, function(err, param_data) {
					if(err) {
						logger.log(err);
						return;
					}
					socket.emit('delete params response', {'file':data.file});
					logger.log("The param file was deleted");
				});
			}
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

	socket.on('restart mavproxy', function(data) {
		logger.log(_companion_directory + '/scripts/restart-mavproxy.sh');
		var cmd = child_process.spawn(_companion_directory + '/scripts/restart-mavproxy.sh', {
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
			logger.log('mavproxy restart exited with code ' + code.toString());
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

	socket.on('restart WL driver', function(data) {
		var cmd = child_process.exec('screen -X -S wldriver quit', function(error, stdout, stderr) {
			logger.log('Stop waterlinked driver:', error, stdout, stderr);
			var args = '';
			if (data.ip) {
				args += ' --ip=' + data.ip;
			}
			if (data.port) {
				args += ' --port=' + data.port;
			}
			child_process.exec('screen -dm -S wldriver ' + _companion_directory + '/tools/underwater-gps.py' + args, function(error, stdout, stderr) {
				logger.log('Start waterlinked driver:', error, stdout, stderr);
			});
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

	// used for ethernet configuration
	socket.on('set default ip', function(ip) {
		logger.log("set default ip", ip);

		child_process.exec('/home/pi/companion/scripts/set_default_client_ip.sh ' + ip, function (error, stdout, stderr) {
			logger.log(stdout + stderr);
		});

	});
	
	socket.on('get current ip', function() {
		logger.log("get current ip");

		child_process.exec("ifconfig | grep -A 1 'eth0' | tail -1 | cut -d ':' -f 2 | cut -d ' ' -f 1", function (error, stdout, stderr) {
			if(!error) {
				socket.emit('current ip', stdout);
			};
		});

	});
});
