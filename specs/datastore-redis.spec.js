describe('Fetcher', function() {
  var Datastore = require('../lib/datastore-redis.js'),
      fs = require('fs'),
      redis = require('redis'),
      async = require('async-leahcimic');

  var datastore = new Datastore({
    fetcher: 'test'
  });

  var client = redis.createClient();

  var queueItem = {url: 'http://example.com', callback: 'test'};
  var data = {apple: 'yummy', avacado: 'yucky'};

  it('Add data to datastore', function(done) {
    async.auto(
      {
        add: function(callback) {
          datastore.add(
            queueItem,
            data,
            callback
          );
        },
        getKey: ['add', function(callback) {
          client.lpop(
            datastore.getRedisKeyPrefix(),
            callback
          );
        }],
        get: ['getKey', function(callback, results) {
          client.get(
            datastore.getRedisKeyPrefix() + ':' + results.getKey,
            callback
          );
        }],
        del: ['get', function(callback, results) {
          client.del(datastore.getRedisKeyPrefix() + ':' + results.getKey, callback);
        }],
        delKey: ['get', function(callback, results) {
          client.del(datastore.getRedisKeyPrefix(), callback);
        }]
      },
      function(error, results) {
        expect(error).toBeFalsy();
        expect(results.get).toEqual(JSON.stringify({queueItem: queueItem, data: data}));
        expect(results.getKey).toEqual('89dce6a446a69d6b9bdc01ac75251e4c322bcdff');
        done();
      }
    );
  });

  /**
   * @todo check it added
   * @todo clean it up
   * @todo
   */

  it('Close redis connection to ensure tests does not hang', function() {
    datastore.destroy();
    client.quit();
  });
});
