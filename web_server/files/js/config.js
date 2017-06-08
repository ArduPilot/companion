var drone_url = "http://192.168.99.1";

/* URL for Ublox MGA data */
var mga_data_url = "http://gps.tridgell.net/data/mga-offline.ubx";

/*
  allow for direct connections to the drone by looking for connections
  to a private IP address range. This isn't perfect, but works well
  enough
*/
try {
    var hosta = window.location.hostname.split('.')
    if ((hosta[0] == 192 && hosta[1] == 168) || hosta[0] == 172 || hosta[0] == 10 || hosta[0] == 127 ||
        window.location.hostname == "tridgell.net") {
        drone_url = '';
    }
} catch(e) {
}

