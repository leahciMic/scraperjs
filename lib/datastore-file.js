/**
 * Datastore
 */

var fs = require('fs'),
    _ = require('underscore');

var Datastore = function(config) {
  var saveTo = process.cwd() + '/' + config.saveTo;
  this.saveTo = saveTo;
  this.ensurePathExists(saveTo);
  this.config = config;
};


/**
 * mkdir recursive
 * @returns true on success, false on failure
 */
Datastore.prototype.mkdirr = function(path) {
  if (fs.existsSync(path))
    return true;

  var paths = path.split('/'),
      i = paths.length;

  if (paths[paths.length - 1] == '')
    paths.length--;

  for (i = paths.length - 1; i > 0; i--)
    if (fs.existsSync(_.first(paths, i).join('/')))
      break;

  for (i = i + 1; i <= paths.length; i++)
    fs.mkdirSync(_.first(paths, i).join('/'));

  return true;
};

Datastore.prototype.ensurePathExists = function(path) {
  return this.mkdirr(path);
};

Datastore.prototype.getFilename = function(queueItem) {
  return this.saveTo + this.options.fetcher + '.jsontape';
};

Datastore.prototype.add = function (queueItem, data, callback) {
  fs.appendFile(
    this.getFilename(queueItem),
    JSON.stringify({queueItem: queueItem, data: data}) + "\r\n",
    'utf8',
    function(error) {
      callback(error == true);
    }
  );
};

module.exports = Datastore;