var Stream = require('stream').Stream,
    BlockStream = require('block-stream'),
    http = require('http'),
    express = require('express'),
    mongo = require('mongodb'),
    es = require('event-stream');

function base64encode(unencoded) {
    if (Buffer.isBuffer(unencoded))
        return unencoded.toString('base64');
  return new Buffer(unencoded || '').toString('base64');
}

function JsonObjectWithBase64PropertyStream(baseObject, streamProperty) {

    var stream = new Stream(),
        first = true,
        ended = false,
        anyData = false,
        open = '{',
        sep = '", "',
        close = '"]}';

    baseObject = baseObject || {};
    for (var key in baseObject) {
        open += JSON.stringify(key) + ':' + JSON.stringify(baseObject[key]) + ',';
    }
    open += JSON.stringify(streamProperty) + ':["';

    stream.write = function (data) {
        anyData = true;
        var chunk = base64encode(data);
        if (first) {
            first = false;
            stream.emit('data', open + chunk);
        } else {
            stream.emit('data', sep + chunk);
        }
    };

    stream.end = function (data) {
        if (ended) return;
        ended = true;
        if (data) stream.write(data);
        if (!anyData) stream.emit('data', open);
        stream.emit('data', close);

        stream.emit('end');
    };

    stream.writable = true;
    stream.readable = true;

    return stream;
}

var file;

function handleRequest(req, res) {

    var baseObject = {id: 123, code: 200};
    var streamProperty = 'data';

    var chunkSize = 256; // this can be greater or lower than gridfs chunk size.

    res.setHeader('Content-Type', 'application/json');

    // create streams
    var base64stream = new JsonObjectWithBase64PropertyStream(baseObject, streamProperty);
    var block = new BlockStream(chunkSize, {nopad: true});

    // At mongodb tools directory, run:
    // $ ./mongofiles put ../README
    file = new mongo.GridStore(db, '../README', "r");
    file.open(function(err, file) {
        var filestream = file.stream(true);

        filestream.on('close', function(){
            //file.close();
        });

        // pipe streams
        filestream
            .pipe(block)
            .pipe(base64stream)
            .pipe(res);
            ;
    });
}


var
    logLength = es.mapSync(function(data){
        console.log(data.length);
        return data;
    }),
    logData = es.mapSync(function (data) {
        //console.log(data.substr(0, 10));
        console.log(base64encode(data).substr(0, 50));
        return data;
    });

var db = new mongo.Db('test', new mongo.Server("127.0.0.1", 27017,
 {auto_reconnect: false, poolSize: 1}), {native_parser: false});


db.open(function(err, db) {

    var server;

    // http or express
    if (true) {
        server = http.createServer(handleRequest);
    } else {
        server = express.createServer();
        server.get('/', handleRequest);
    }

    server.listen(1337);
});

/*

 Try using:

     curl --verbose --no-buffer "http://localhost:1337/"

 ...or:

    node client.js

 */
