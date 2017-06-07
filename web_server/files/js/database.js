/*
  store persistent data in pouchdb
*/

var ardupilot_db = new PouchDB('ArduPilot');

function db_store(key, value) {
    ardupilot_db.get(key, function(err, doc) {
        if (err) {
            console.log("storing " + key + ":" + value);
            ardupilot_db.put({_id : key, value: value});
        } else {
            console.log("updating " + key + ":" + value);
            ardupilot_db.put({_id : key, _rev: doc._rev, value: value});
        }
    });
}

function db_fetch(key, callback) {
    ardupilot_db.get(key, function(err, doc) {
        if (err) {
            return console.log("key: " + key + " err: " + err);
        }
        console.log("fetched " + key + ":" + doc.value);
        callback(doc.value);
    });
}

function db_fetch_onerror(key, callback, onerror) {
    ardupilot_db.get(key, function(err, doc) {
        if (err) {
            onerror();
            return;
        }
        console.log("fetched " + key + ":" + doc.value);
        callback(doc.value);
    });
}
