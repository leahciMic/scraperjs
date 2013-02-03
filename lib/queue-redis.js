var _ = require('underscore'),
    redis = require('redis'),
    sha1 = require('../contrib/sha1.js'),
    async = require('async'),
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
    this.getRedisKeyPrefix() + ':' + sha1(url),
    function(errors, data) {
      callback(data !== null);
    }
  );
};

QueueRedis.prototype.getRedisKeyPrefix = function(fetcher) {
  if (typeof fetcher === 'undefined')
    fetcher = this.options.fetcher;
  return 'queue:' + fetcher;
};

QueueRedis.prototype.length = function(callback) {
  this.client.llen(
    this.getRedisKeyPrefix(),
    function(errors, count) {
      callback(count);
    }
  )
};

QueueRedis.prototype._add = function(queueItem, callback) {
  var queue = this;
  async.auto(
    {
      checkExists: function(callback) {
        queue.exists(
          queueItem.url,
          function(exists) {
            callback(false, exists);
          }
        );
      },
      addQueueItem: ['checkExists', function(callback, results) {
        if (results.checkExists)
          return callback(false);
        queue.client.multi()
          .set(
            queue.getRedisKeyPrefix() + ':' + sha1(queueItem.url),
            JSON.stringify(queueItem)
          )
          .rpush(
            queue.getRedisKeyPrefix(),
            sha1(queueItem.url)
          )
          .exec(function(error) {
            callback(error);
          });
      }]
    },
    function(error) {
      callback(error);
    }
  );
};

QueueRedis.prototype.add = function(queueItem, callback) {
  var urls = [],
      queue = this;

  if (typeof callback != 'function')
    callback = noop;

  if (_.isArray(queueItem)) {
    if (!queueItem.length)
      callback(true);

    async.forEach(
      queueItem,
      function(queueItem, callback) {
        if (urls.indexOf(queueItem.url) !== -1)
          callback(true);
        urls.push(queueItem.url);
        queue.add(
          queueItem,
          callback
        );
      },
      function(error) {
        callback(error);
      }
    );
  } else
    this._add(
      queueItem,
      function() {
        callback();
      }
    );
};

QueueRedis.prototype.clear = function(callback) {
  var queue = this;
  this.getAllKeys(
    function(queueItemKeys) {
      queueItemKeys.push(queue.getRedisKeyPrefix());
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
      queue.getRedisKeyPrefix(),
      0,
      len,
      function(errors, rawKeys) {
        var queueItemKeys = [];
        _.each(
          rawKeys,
          function(key) {
            queueItemKeys.push(
              queue.getRedisKeyPrefix() + ':' + key
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
    queue.getRedisKeyPrefix(),
    function(errors, key) {
      queue.client.get(
        queue.getRedisKeyPrefix() + ':' + key,
        function(errors, queueItemJson) {
          queue.client.del(
            queue.getRedisKeyPrefix() + ':' + key,
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
