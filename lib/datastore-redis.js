/**
 * Datastore
 */
var fs = require('fs'),
    _ = require('underscore'),
    redis = require('redis'),
    sha1 = require('../contrib/sha1.js'),
    async = require('async-leahcimic');

var Datastore = function(options) {
  this.client = redis.createClient().on(
    'error',
    function(error) {
      console.log('Redis error: ' + error);
    }
  );
  this.options = options;
};

Datastore.prototype.getRedisKeyPrefix = function() {
  return 'data:' + this.options.fetcher;
};

Datastore.prototype.destroy = function() {
  this.client.quit();
};

Datastore.prototype.add = function (queueItem, data, callback) {
  var datastore = this;
  async.auto(
    {
      exists: function(callback) {
        datastore.client.exists(
          datastore.getRedisKeyPrefix() + ':' + sha1(queueItem.url),
          callback
        );
      },
      add: ['exists', function(callback, results) {
        if (results.exists == 1)
          return callback(false);
        datastore.client.multi()
          .set(
            datastore.getRedisKeyPrefix() + ':' + sha1(queueItem.url),
            JSON.stringify({queueItem: queueItem, data: data})
          )
          .lpush(
            datastore.getRedisKeyPrefix(),
            sha1(queueItem.url)
          ).exec(callback);
      }]
    },
    callback
  );
};

module.exports = Datastore;
