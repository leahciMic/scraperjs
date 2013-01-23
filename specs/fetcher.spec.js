describe('Fetcher', function() {
  var Fetcher = require('../lib/fetcher.js');
  var fetcher = new Fetcher({name: 'test'});

  var test_html = '<html><head><base href="http://example.com" /></head><body><h1>Test page</h1><ul><li><a href="http://example.com/page/1/">Page 1</a></li><li><a href="page/2/">Page 2</a></ul><span>product/45/</span><div><p id="text">This is sample text.</p><input id="input" value="Sample value" /><img id="image" src="image.jpg" />AN6RMH3GCS5952YCCQKS</div></body></html>';

  var queueItem = {
    url: 'http://www.google.com',
    callback: 'test'
  };

  it('jQuery returns jQuery object', function(done) {
    fetcher.getjQuery(
      test_html,
      function($) {
        expect($('h1').text()).toEqual('Test page');
        done();
      }
    );
  });

  it('Get base url', function(done) {
    fetcher.getjQuery(
      test_html,
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
      test_html,
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

  it('Processing links', function(done) {
    fetcher.getjQuery(
      test_html,
      function($) {
        var links = fetcher.processLinks(
          {
            links: {
              'a': 'test'
            }
          }, $, test_html, queueItem
        );
        expect(links[0].url).toEqual('http://example.com/page/1/');
        expect(links[1].url).toEqual('http://example.com/page/2/');
        expect(links[0].callback).toEqual('test');
        expect(links[1].callback).toEqual('test');
        links = fetcher.processLinks(
          {
            links: {
              '/product\\/45\\//': 'test'
            }
          }, $, test_html, queueItem
        );
        expect(links[0].url).toEqual('http://example.com/product/45/');
        expect(links[0].callback).toEqual('test'); 

        done();
      }
    );
  });

  // @lastTouched in the process of writing tests for processing data
  /**
   * A couple of memory dumps for when I come back,
   * prcessLinks now returns links rather than adding them to the
   * queue.
   * getjQuery is no longer synchronous.
   * fetcher/parser no longer separated
   */
   
  it('Processing data', function(done) {
    //Fetcher.prototype.processData = function(actions, $, html, queueItem, root) {
    fetcher.getjQuery(
      test_html,
      function($) {
        var data = fetcher.processData(
          {
            data: {
              'jqnormalelement': '#text',
              'jqinput': '#input',
              'jqimage': '#image',
              'regex': '/AN6RMH3GCS5952YCCQKS/',
              'func': function() {
                // @todo ensure we are getting passed the correct params
                return 'oogie';
              }
            }
          },
          $,
          test_html,
          queueItem,
          function(data) {
            expect(data.jqnormalelement).toEqual('This is sample text.');
            expect(data.jqinput).toEqual('Sample value');
            expect(data.jqimage).toEqual('image.jpg');
            expect(data.regex).toEqual('AN6RMH3GCS5952YCCQKS');
            expect(data.func).toEqual('oogie');
            done();
          }
        );
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
