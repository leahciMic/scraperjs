describe('Queue Redis', function() {
  var QM = require('../lib/queue-redis.js'),
      qm = new QM({fetcher: 'test'}),
      async = require('async-leahcimic'),
      sha1 = require('../contrib/sha1.js'),
      mock = {
        queueItem: {url: 'http://example.com', callback: 'test', meta: 'yes'}
      },
      cleanqm;

  cleanqm = new QM({fetcher: 'test'});
  it('complete', function(done) {
    var methods = {};
    methods.lrem = jasmine.createSpy('lrem').andCallFake(function() {
      return methods;
    });

    methods.lpush = jasmine.createSpy('lpush').andCallFake(function() {
      return methods;
    });

    methods.set = jasmine.createSpy('set').andCallFake(function() {
      return methods;
    });

    methods.exec = jasmine.createSpy('exec').andCallFake(function(callback) {
      callback(false);
    });

    spyOn(cleanqm.client, 'multi').andCallFake(function() {
      return methods;
    });

    cleanqm.complete(mock.queueItem, function(error) {
      expect(error).toBeFalsy();
      expect(methods.lrem).toHaveBeenCalledWith(
        cleanqm.getRedisKeyPrefix() + ':inprogress',
        0,
        sha1(mock.queueItem.url)
      );
      done();

    });
  });
  cleanqm.destroy();

  cleanqm = new QM({fetcher: 'test'});
  it('fail', function(done) {
    var methods = {};
    methods.lrem = jasmine.createSpy('lrem').andCallFake(function() {
      return methods;
    });

    methods.lpush = jasmine.createSpy('lpush').andCallFake(function() {
      return methods;
    });

    methods.set = jasmine.createSpy('set').andCallFake(function() {
      return methods;
    });

    methods.exec = jasmine.createSpy('exec').andCallFake(function(callback) {
      callback(false);
    });

    spyOn(cleanqm.client, 'multi').andCallFake(function() {
      return methods;
    });

    cleanqm.fail(mock.queueItem, function(error) {
      expect(error).toBeFalsy();
      expect(methods.set).toHaveBeenCalledWith(
        cleanqm.getRedisKeyPrefix() + ':' + sha1(mock.queueItem.url),
        JSON.stringify(mock.queueItem)
      );
      expect(methods.lpush).toHaveBeenCalledWith(
        cleanqm.getRedisKeyPrefix() + ':fail',
        sha1(mock.queueItem.url)
      );
      expect(methods.lrem).toHaveBeenCalledWith(
        cleanqm.getRedisKeyPrefix() + ':inprogress',
        0,
        sha1(mock.queueItem.url)
      );
      done();

    });
  });
  cleanqm.destroy();

  it('Initial length should be zero', function(done) {
    qm.length(function(len) {
      expect(len).toEqual(0);
      done();
    });
  });

  it('Get on an empty list', function(done) {
    qm.get(function(error) {
      expect(error instanceof Error).toEqual(true);
      expect(error.message).toEqual('QUEUE_EMPTY');
      done();
    });
  });

  it('Stores metadata correctly', function(done) {
    qm.add(mock.queueItem, function() {
      qm.get(function(error, queueItem) {
        expect(error).toBeFalsy();
        expect(queueItem.meta).toBeDefined();
        expect(queueItem).toEqual(mock.queueItem);
        qm.complete(mock.queueItem, function() {
          async.parallel([
            function(callback) {
              qm.client.del('queue:test:89dce6a446a69d6b9bdc01ac75251e4c322bcdff', callback);
            },
            function(callback) {
              qm.client.del('queue:test:complete', callback);
            }],
            function(err, results) {
              expect(err).toBeFalsy();
              done();
            }
          );
        });
      });
    });
  });

  it('Add an item', function(done) {
    qm.add({url: 'http://example.com', callback: 'test'}, function() {
      qm.length(function(len) {
        expect(len).toEqual(1);
        done();
      });
    });
  });

  it('Add an empty array', function(done) {
    qm.length(function(origlen) {
      qm.add(
        [],
        function() {
          qm.length(function(len) {
            expect(len).toEqual(origlen);
            done();
          });
        }
      );
    });
  });

  it('Add an array of items', function(done) {
    qm.add(
      [
        {url: 'http://example.com/2', callback: 'test2'},
        {url: 'http://example.com/3', callback: 'test3'},
        {url: 'http://example.com/4', callback: 'test4'}
      ],
      function() {
        qm.length(function(len) {
          expect(len).toEqual(4);
          done();
        });
      }
    )
  });

  it('Item exists', function(done) {
    qm.exists('http://example.com', function(exists) {
      expect(exists).toEqual(true);
      done();
    });
  });

  it('Item does not exist', function(done) {
    qm.exists('http://example.com/noexist', function(exists) {
      expect(exists).toEqual(false);
      done();
    });
  });

  it('Get an item', function(done) {
    qm.get(function(error, qi) {
      qm.length(function(len) {
        expect(len).toEqual(3);
        expect(qi.url).toEqual('http://example.com');
        expect(qi.callback).toEqual('test');
        qm.complete(
          qi,
          function(error) {
            expect(error).toBeFalsy();
            async.parallel([
              function(callback) {
                qm.client.del('queue:test:89dce6a446a69d6b9bdc01ac75251e4c322bcdff', callback);
              },
              function(callback) {
                qm.client.del('queue:test:completed', callback);
              }],
              function(err, results) {
                expect(err).toBeFalsy();
                done();
              }
            );
          }
        );
      });
    });
  });

  it('Clear items', function(done) {
    qm.clear(function(cleared) {
      expect(cleared).toEqual(true);
      qm.length(function(len) {
        expect(len).toEqual(0);
        done();
      });
    });
  });

  it('Get on empty queue should return false', function(done) {
    qm.get(function(error, qi) {
      expect(qi).toBeFalsy();
      done();
    });
  });

  // test in progress shit
  it('Ensure in progress items aren\'t lost', function(done) {
    qm.add(
      {url: 'http://example.com', callback: 'test'},
      function(error) {
        qm.get(function(error, qi) {
          qm.length(function(beforeLength) {
            qm.restoreInProgress(function() {
              qm.length(function(afterLength) {
                expect(beforeLength).toEqual(0);
                expect(afterLength).toEqual(1);
                qm.clear(function() {
                  // @todo investigate if anything needs cleaning up here
                  done();
                });
              });
            });
          });
        });
      }
    );
  });

  it('Close redis connection to complete tests', function() {
    qm.destroy();
  });
});
