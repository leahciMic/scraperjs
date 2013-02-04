describe('Fetcher', function() {
  var Datastore = require('../lib/datastore-file.js'),
      fs = require('fs');

  var datastore = new Datastore({
    saveTo: 'datastore-file-test/',
    fetcher: 'test-fetcher'
  });

  it(
    'Datastore to create saveTo path',
    function() {
      expect(fs.existsSync(datastore.options.saveTo)).toEqual(true);
    }
  );

  it(
    'mkdirr to create directory 3 levels deep',
    function() {
      expect(datastore.mkdirr('mkdirr/test/directory')).toEqual(true);
      expect(fs.existsSync('mkdirr/test/directory')).toEqual(true);
      fs.rmdirSync('mkdirr/test/directory');
      fs.rmdirSync('mkdirr/test');
      fs.rmdirSync('mkdirr');
    }
  );

  it(
    'mkdirr to create directory 1 level deep',
    function() {
      expect(datastore.mkdirr('mkdirr-test')).toEqual(true);
      expect(fs.existsSync('mkdirr-test')).toEqual(true);
      fs.rmdirSync('mkdirr-test');
    }
  );

  it('Add data to datastore', function(done) {
    datastore.add(
      {url: 'http://example.com'},
      {
        test: 'test'
      },
      function(error) {
        var datastr = fs.readFileSync(datastore.getFilename('test-fetcher'), 'utf8');
        expect(datastr).toEqual(
          '{"queueItem":{"url":"http://example.com"},"data":{"test":"test"}}' + "\r\n"
        );
        fs.unlinkSync(datastore.getFilename('test-fetcher'));
        done();
      }
    );
  });

  it('remove datastore-file-test directory', function() {
    fs.rmdir('datastore-file-test');
  });
});
