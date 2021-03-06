var _ = require('underscore'),
    noop = function(){};

var QueueMemory = global.QueueMemory = function() {
  this.queue = [];
  this.urlsVisited = [];
};

QueueMemory.prototype.exists = function(url, callback) {
  var exists = false;
  _.map(
    this.queue,
    function(queueItem) {
      if (url == queueItem.url)
        exists = true;
    },
    this
  );
  if (_.indexOf(this.urlsVisited, url) !== -1)
    exists = true;

  callback(exists);
};

QueueMemory.prototype.length = function(callback) {
  callback(this.queue.length);
};

QueueMemory.prototype.fail = function(queueItem, callback) {
  callback(false);
};

QueueMemory.prototype.complete = function(queueItem, callback) {
  callback(false);
};

QueueMemory.prototype.update = function(queueItem, callback) {
  var fetcher = this;
  this.queue.push(queueItem);
  callback(false);
};

QueueMemory.prototype.add = function(queueItem, callback) {
  var fetcher = this;
  if (typeof callback != 'function')
    callback = noop;
  if (_.isArray(queueItem)) {
    if (!queueItem.length)
      // no error adding nothing
      return callback(false);
    var queueItemsRemaining = queueItem.length;
    _.map(
      queueItem,
      function(queueItem) {
        this.add(
          queueItem,
          function() {
            if (--queueItemsRemaining == 0)
              callback(false);
          }
        );
      },
      this
    );
  } else {
    this.exists(
      queueItem.url,
      function(exists) {
        if (!exists)
          fetcher.queue.push(queueItem);
        callback(false);
      }
    );
  }
};

QueueMemory.prototype.clear = function(callback) {
  this.queue = [];
  callback(false);
};

QueueMemory.prototype.get = function(callback) {
  var queueItem = this.queue.shift();

  if (_.isUndefined(queueItem))
    return callback(new Error('QUEUE_EMPTY'));

  this.urlsVisited.push(queueItem.url);
  callback(false, queueItem);
};

module.exports = QueueMemory;
