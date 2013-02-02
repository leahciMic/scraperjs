var _ = require('underscore'),
    redis = require('redis'),
    sha1 = require('../contrib/sha1.js'),
    noop = function(){};

var QueueRedis = function(options) {
  this.client = redis.createClient().on(
    'error',
    function(error) {
      console.log('Redis error: ' + error);
    }
  );
  this.queue = [];
  this.urlsVisited = [];
  this.options = options;
};

QueueRedis.prototype.destroy = function() {
  this.client.quit();
};

QueueRedis.prototype.exists = function(url, callback) {
  this.client.get(
    this.getRedisKeyPrefix(this.options.fetcher) + ':' + sha1(url),
    function(errors, data) {
      callback(data !== null);
    }
  );
};

QueueRedis.prototype.getRedisKeyPrefix = function(fetcher) {
  return 'queue:' + fetcher;
};

QueueRedis.prototype.length = function(callback) {
  this.client.llen(
    this.getRedisKeyPrefix(this.options.fetcher),
    function(errors, count) {
      callback(count);
    }
  )
};

QueueRedis.prototype.add = function(queueItem, callback) {
  var urls = [],
      queue = this;
  if (typeof callback != 'function')
    callback = noop;
  if (_.isArray(queueItem)) {
    if (!queueItem.length) {
      // no error adding nothing
      return process.nextTick(function() {
        callback(true);
      });
    }
    var queueItemsRemaining = queueItem.length;
    _.map(
      queueItem,
      function(queueItem) {
        if (urls.indexOf(queueItem.url) !== -1) {
          return process.nextTick(function() {
            callback(true);
          });
        }
        urls.push(queueItem.url);
        this.add(
          queueItem,
          function() {
            if (--queueItemsRemaining == 0) {
              callback(true);
            }
          }
        );
      },
      this
    );
  } else {
    this.exists(
      queueItem.url,
      function(exists) {
        if (!exists) {
          queue.client.set(
            queue.getRedisKeyPrefix(queue.options.fetcher) + ':' + sha1(queueItem.url),
            JSON.stringify(queueItem),
            function(errors) {
              queue.client.rpush(
                queue.getRedisKeyPrefix(queue.options.fetcher),
                sha1(queueItem.url),
                function(errors) {
                  callback(true);
                }
              );
            }
          );
        } else {
          callback(false);
        }
      }
    );
  }
};

QueueRedis.prototype.clear = function(callback) {
  var queue = this;
  this.getAllKeys(
    function(queueItemKeys) {
      queueItemKeys.push(queue.getRedisKeyPrefix(queue.options.fetcher));
      queue.client.del(
        queueItemKeys,
        function(errors) {
          callback(true);
        }
      );
    }
  );
};

QueueRedis.prototype.getAllKeys = function(callback) {
  var queue = this;
  this.length(function(len) {
    queue.client.lrange(
      queue.getRedisKeyPrefix(queue.options.fetcher),
      0,
      len,
      function(errors, rawKeys) {
        var queueItemKeys = [];
        _.each(
          rawKeys,
          function(key) {
            queueItemKeys.push(
              queue.getRedisKeyPrefix(queue.options.fetcher) + ':' + key
            );
          }
        );
        callback(queueItemKeys);
      }
    );
  });
};

QueueRedis.prototype.getAll = function(callback) {
  var queue = this;
  this.getAllKeys(
    function(queueItemKeys) {
      queue.client.mget(
        queueItemKeys,
        function(errors, rawDataArray) {
          var dataArray = [];
          _.each(
            rawDataArray,
            function(data) {
              dataArray.push(JSON.parse(data));
            }
          );
          callback(dataArray);
        }
      );
    }
  );
};

QueueRedis.prototype.get = function(callback) {
  var queue = this;
  this.client.lpop(
    queue.getRedisKeyPrefix(queue.options.fetcher),
    function(errors, key) {
      queue.client.get(
        queue.getRedisKeyPrefix(queue.options.fetcher) + ':' + key,
        function(errors, queueItemJson) {
          queue.client.del(
            queue.getRedisKeyPrefix(queue.options.fetcher) + ':' + key,
            function(errors) {
              callback(JSON.parse(queueItemJson));
            }
          );
        }
      );
    }
  );
};

module.exports = QueueRedis;
