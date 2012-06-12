require('bufferjs/concat');
var request = require('request'),
    Stream = require('stream').Stream,
    JSONStream = require('JSONStream'),
    es = require('event-stream');

function Base64DecoderStream() {

    var stream = new Stream(),
        ended = false;

    stream.write = function (data) {
        data = new Buffer(data || '', 'base64');
        stream.emit('data', data);
    };

    stream.end = function (data) {
        if (ended) return;
        ended = true;
        if (data)
            stream.write(data);
        stream.emit('end');
    };

    stream.writable = true;
    stream.readable = true;

    return stream;
}


var output = new Buffer(0),
    req = request({url: 'http://localhost:1337/'}),
    parser = JSONStream.parse(['data', /./]),
    release = es.map(function(data, cb) {
        // release memory as the array grows
        var array = parser.root.data;
        array[array.length - 1] = null;

        // Uncomment the following to throw an error in the middle of the streaming.
        //if (array.length == 3) {
            //cb(new Error('OH MY!'));
            //return;
        //}

        cb(null, data);
    }),
    decoder = new Base64DecoderStream(),
    appender = es.mapSync(function(data) {
        output = Buffer.concat(output, data);
        return data;
    });

var aborted = false;
req.on('abort', function(){
    aborted = true;
});
req.on('end', function(){
    if (!aborted) {
        parser.root.data = [output.toString()];
    }
    console.log(parser.root);
});

function errorHandler(err){
    req.abort();
    if (require('util').isError(err))
        console.error(err.stack);
    parser.root.msg = err.message;
    parser.root.code = 500;
    parser.root.data = [];
}

parser.on('error', errorHandler);
decoder.on('error', errorHandler);
release.on('error', errorHandler);

req
    .pipe(parser)
    .pipe(decoder)
    .pipe(release)
    .pipe(es.log())
    .pipe(appender)
    ;
