describe('Fetcher', function() {
  var Fetcher = require('../lib/fetcher.js');
  var fetcher = new Fetcher({name: 'test'});

  var queueItem = {
    url: 'http://www.google.com',
    callback: 'test'
  };

  it('jQuery returns jQuery object', function(done) {
    fetcher.getjQuery(
      '<html><head></head><body><div>Test</div></body></html>',
      function($) {
        expect($('div').text()).toEqual('Test');
        done();
      }
    );
  });

  it('Get base url', function(done) {
    fetcher.getjQuery(
      '<html><head><base href="http://example.com" /></head><body><div>Test</div></body></html>',
      function($) {
        expect(
          fetcher.getBaseUrl($, queueItem)
        ).toEqual('http://example.com/');
        $('base').attr('href', 'http://example.com/');
        expect(
          fetcher.getBaseUrl($, queueItem)
        ).toEqual('http://example.com/');
        $('base').attr('href', 'http://example.com/test/');
        expect(
          fetcher.getBaseUrl($, queueItem)
        ).toEqual('http://example.com/test/');
        $('base').remove();
        expect(
          fetcher.getBaseUrl($, queueItem)
        ).toEqual('http://www.google.com/');
        done();
      }
    );
  });

  it('Normalize url', function(done) {
    fetcher.getjQuery(
      '<html><head><base href="http://example.com" /></head><body><div>Test</div></body></html>',
      function($) {
        expect(
          fetcher.normalizeUrl('test', $, queueItem)
        ).toEqual('http://example.com/test');
        $('base').attr('href', 'http://example.com/example');
        expect(
          fetcher.normalizeUrl('test', $, queueItem)
        ).toEqual('http://example.com/example/test');        
        $('base').remove();
        expect(
          fetcher.normalizeUrl('test', $, queueItem)
        ).toEqual('http://www.google.com/test');
        done();
      }  
    );
  });

  

  it('Fetch http://www.google.com', function(done) {
    runs(function() {
      fetcher.fetch(
        queueItem,
        function(html, response) {
          expect(response.statusCode).toEqual(200);
          done();
        }
      );
    });
  });
});
