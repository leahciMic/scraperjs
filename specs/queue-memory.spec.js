describe('Memory Queue', function() {
  var QM = require('../lib/queue-memory.js'),
      qm = new QM({fetcher: 'test'}),
      cleanqm,
      mock = {
        queueItem: {url: 'http://example.com', callback: 'test', meta: 'yes'}
      };

  beforeEach(function() {
    cleanqm = new QM({fetcher: 'test'});
  });

  it('Initial length should be zero', function(done) {
    qm.length(function(len) {
      expect(len).toEqual(0);
      done();
    });
  });

  it('Fail', function(done) {
    // fail() is empty function atm
    done();
  });

  it('Get on an empty queue should return QUEUE_EMPTY', function(done) {
    qm.get(function(error, queueItem) {
      expect(error instanceof Error).toEqual(true);
      expect(error.message).toEqual('QUEUE_EMPTY');
      done();
    });
  });

  it('Stores metadata correctly', function(done) {
    cleanqm.add(mock.queueItem, function() {
      cleanqm.get(function(error, queueItem) {
        expect(error).toBeFalsy();
        expect(queueItem.meta).toBeDefined();
        expect(queueItem).toEqual(mock.queueItem);
        cleanqm.complete(queueItem, function() {
          done();
        });
      });
    });
  });

  it('Add an item', function(done) {
    qm.add({url: 'http://example.com', callback: 'test'}, function(error) {
      qm.length(function(len) {
        expect(error).toBeFalsy();
        expect(len).toEqual(1);
        done();
      });
    });
  });

  it('Add an empty array', function(done) {
    qm.length(function(origlen) {
      qm.add(
        [],
        function(error) {
          qm.length(function(len) {
            expect(error).toBeFalsy();
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
      function(error) {
        qm.length(function(len) {
          expect(error).toBeFalsy();
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
        done();
      });
    });
  });

  it('Clear items', function(done) {
    qm.clear(function(error) {
      expect(error).toEqual(false);
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

});
