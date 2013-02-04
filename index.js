var Config = require('./config.js');
global.config = Config.get();

var fs = require('fs');
var _ = require('underscore');

fs.readdir(
  './fetchers',
  function(err, files) {
    _.each(
      files,
      function(file, i) {
        var name, fetcher;
        if ((name = file.match(/(.*)\.js/))) {
          fetcher = require('./fetchers/' + file);
          fetcher = new fetcher({
            name: name[1],
            queuestore: config.queuestore
            datastore: config.datastore
          });
          fetcher.start();
        }
      }
    );
  }
);
