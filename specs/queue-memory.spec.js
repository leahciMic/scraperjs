describe('Memory Queue', function() {
  var QM = require('../lib/queue-memory.js');
  var qm = new QM({fetcher: 'test'});

  it('Initial length should be zero', function(done) {
    qm.length(function(len) {
      expect(len).toEqual(0);
      done();
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

  it('Get all items', function(done) {
    qm.getAll(function(urls) {
      expect(urls[0].url).toEqual('http://example.com');
      expect(urls[0].callback).toEqual('test');
      expect(urls[1].url).toEqual('http://example.com/2');
      expect(urls[1].callback).toEqual('test2');
      done();
    });
  });

  it('Get an item', function(done) {
    qm.get(function(qi) {
      qm.length(function(len) {
        expect(len).toEqual(3);
        expect(qi.url).toEqual('http://example.com');
        expect(qi.callback).toEqual('test');
        done();
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
    qm.get(function(qi) {
      expect(qi).toBeFalsy();
      done();
    });
  });

});
