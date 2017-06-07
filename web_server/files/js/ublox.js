
/*
  library to upload MGA data to uBlox GPS for fast fix
*/

var mga_poll_period = 5000;
var last_pos = null;
var sent_last_pos = false;

function set_last_pos(pos) {
    last_pos = pos;
}

/*
  handle downloaded MGA data
*/
function handle_mga_data(data) {
    var utc_sec = new Date().getTime() / 1000;
    var new_data = { timestamp : utc_sec, data : data };
    db_store("mga_data", new_data);
    set_mga_data(new_data);
}

/*
  download MGA data and store into the database
*/
function download_mga_data() {
    console.log("Downloading mga data from " + mga_data_url);
    ajax_get_callback_binary(mga_data_url, handle_mga_data);
}

/*
  called by database when it has fetched mga_data
*/
function set_mga_data(data) {
    console.log("mga_data length " + data.data.byteLength);
    var utc_sec = new Date().getTime() / 1000;
    if (data.timestamp > utc_sec + 60*60*24*7) {
        download_mga_data();
    }
    var formData = new FormData();
    formData.append("command1", "mga_upload()");
    formData.append("mga_data", new Blob([data.data], { type : "data" }));
    if (last_pos != null && last_pos.length == 3) {
        console.log("Sending pos: " + last_pos);
        formData.append("latitude", last_pos[0]*1e7);
        formData.append("longitude", last_pos[1]*1e7);
        formData.append("altitude", last_pos[2]);
        formData.append("utc_time", utc_sec);
        sent_last_pos = true;
    }
    
    /* send the date again */
    set_sonix_date();
    
    var xhr = createCORSRequest("POST", drone_url + "/ajax/command.json");
    xhr.send(formData);
    setTimeout(poll_ublox_status, mga_poll_period);
}

function check_mga_status(json) {
    try {
        mga_status = JSON.parse(json);
    } catch(e) {
        console.log(e);
        setTimeout(poll_ublox_status, mga_poll_period);
        return;
    }
    page_fill_json_html(mga_status);
    var utc_sec = new Date().getTime() / 1000;
    if (mga_status.offline_cache_size > 0 &&
        (last_pos == null || sent_last_pos)) {
        // its all up to date, don't send it the data
        setTimeout(poll_ublox_status, mga_poll_period);

        // set the date if needed
        if (mga_status.fc_time < utc_sec - 10*60) {
            set_sonix_date();
        }
        return;
    }
    db_fetch_onerror('mga_data', set_mga_data, download_mga_data);
}

function poll_ublox_status() {
    if (last_pos == null) {
        db_fetch('last_position', set_last_pos);
    }
    
    command_send("mga_status()", { onload : check_mga_status });
}
