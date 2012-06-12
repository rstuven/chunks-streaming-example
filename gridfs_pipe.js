var mongo = require('mongodb'),
    es = require('event-stream');

function base64encode(unencoded) {
    if (Buffer.isBuffer(unencoded))
        return unencoded.toString('base64');
  return new Buffer(unencoded || '').toString('base64');
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

    // At mongodb tools directory, run:
    // $ ./mongofiles put ./bsondump
    var file = new mongo.GridStore(db, 'bsondump', "r");
    file.open(function(err, file) {
        var filestream = file.stream(true);

        filestream.on('close', function(){
            db.close();
        });

        filestream
            .pipe(logLength)
            .pipe(logData)
            ;
    });
});
