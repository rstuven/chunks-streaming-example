var Stream = require('stream').Stream,
    http = require('http'),
    express = require('express'),
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


function handleRequest(req, res) {

    // create streams
    var base64stream = new JsonObjectWithBase64PropertyStream({id: 123, code: 200}, 'data'),
        defer = (function(){
            var timeout = 0;
            return function(time) {
                return es.map(function(data, callback) {
                    timeout += time;
                    setTimeout(function(){
                        callback(null, data);
                    }, timeout);
                });
            };
        })();

    //res.setHeader('Content-Type', 'application/json');

    // pipe streams
    base64stream
        .pipe(defer(500))
        .pipe(res);

    // write to first stream
    for (var i = 1; i <= 10; i++) {
        base64stream.write(new Buffer('chunk' + i + '. '));
    }
    base64stream.end();

}

var server;

// http or express
if (true) {
    server = http.createServer(handleRequest);
} else {
    server = express.createServer();
    server.get('/', handleRequest);
}

server.listen(1337);

