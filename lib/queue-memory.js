var _ = require('underscore'),
    noop = function(){};

var QueueMemory = global.QueueMemory = function() {
  this.queue = [];
  this.urlsVisited = [];
  this.exists = function(url) {
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
    return exists;
  };
  this.length = function() {
    return this.queue.length;
  };
  this.add = function(queueItem, callback) {
    if (typeof callback != 'function')
      callback = noop;
    if (_.isArray(queueItem)) {
      if (!queueItem.length) {
        // no error adding nothing
        callback(true);
        return;
      }
      var queueItemsRemaining = queueItem.length;
      _.map(
        queueItem,
        function(queueItem) {
          this.add(
            queueItem,
            function() {
              if (--queueItemsRemaining == 0)
                callback(true);
            }
          );
        },
        this
      );
    } else {
      // /(https?|ftp):\/\/(-\.)?([^\s\/?\.#-]+\.?)+(\/[^\s]*)?$/
      if (!this.exists(queueItem.url))
        this.queue.push(queueItem);
      callback(true);
    }
  };
  this.clear = function() {
    this.queue = [];
  };
  this.getAll = function() {
    return this.queue;
  };
  this.get = function() {
    var queueItem = this.queue.shift();
    if (_.isUndefined(queueItem))
      return false;
    this.urlsVisited.push(queueItem.url);
    return queueItem;
  }
};
module.exports = QueueMemory;
