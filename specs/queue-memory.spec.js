describe('Memory Queue', function() {
  var QM = require('../lib/queue-memory.js');
  var qm = new QM();

  it('Initial length should be zero', function() {
    expect(qm.length()).toEqual(0);
  });

  it('Add an item', function(done) {
    qm.add({url: 'http://example.com', callback: 'test'}, function() {
      expect(qm.length()).toEqual(1);
      done();
    });
  });

  it('Add an empty array', function(done) {
    var qlength = qm.length();
    qm.add(
      [],
      function() {
        expect(qm.length()).toEqual(qlength);
        done();
      }
    );
  });

  it('Add an array of items', function(done) {
    qm.add(
      [
        {url: 'http://example.com/2', callback: 'test2'},
        {url: 'http://example.com/3', callback: 'test3'},
        {url: 'http://example.com/4', callback: 'test4'}
      ],
      function() {
        expect(qm.length()).toEqual(4);
        done();
      }
    )
  });

  it('Item exists', function() {
    expect(
      qm.exists('http://example.com')
    ).toEqual(true);
  });

  it('Get all items', function() {
    var urls = qm.getAll();
    expect(urls[0].url).toEqual('http://example.com');
    expect(urls[0].callback).toEqual('test');
    expect(urls[1].url).toEqual('http://example.com/2');
    expect(urls[1].callback).toEqual('test2');
  });

  it('Get an item', function() {
    var qi = qm.get();
    expect(qm.length()).toEqual(3);
    expect(qi.url).toEqual('http://example.com');
    expect(qi.callback).toEqual('test');
  });

  it('Clear items', function() {
    qm.clear();
    expect(qm.length()).toEqual(0);
  });

  it('Get on empty queue should return false', function() {
    expect(qm.get()).toBeFalsy();
  });

});
