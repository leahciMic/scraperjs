/**
 * Datastore
 */

var fs = require('fs'),
    _ = require('underscore'),
    redis = require('redis'),
    sha1 = require('../contrib/sha1.js');

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
  // @todo should check if exists first?
  var datastore = this;
  this.client.multi()
    .set(
      this.getRedisKeyPrefix() + ':' + sha1(queueItem.url),
      JSON.stringify({queueItem: queueItem, data: data})
    )
    .lpush(
      this.getRedisKeyPrefix(),
      sha1(queueItem.url)
    ).exec(function(error) {
      callback(error);
    });
};

module.exports = Datastore;