describe('Memory Queue', function() {
  var QM = require('../lib/queue-memory.js');
  var qm = new QM();

  it('Initial length should be zero', function() {
    expect(qm.length()).toEqual(0);
  });

  it('Add an item', function() {
    qm.add('http://example.com', 'test');
    expect(qm.length()).toEqual(1);
    qm.add('http://example.com/2', 'test2');
    expect(qm.length()).toEqual(2);
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
    expect(qm.length()).toEqual(1);
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
