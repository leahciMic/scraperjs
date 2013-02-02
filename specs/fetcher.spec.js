describe('Fetcher', function() {
  var mock = {
    data: {
      'jqnormalelement': '#text',
      'jqinput': '#input',
      'jqimage': '#image',
      'regex': '/AN6RMH3GCS5952YCCQKS/',
      'func': function($, html, queueItem) {
        // @todo ensure we are getting passed the correct params
        return 'oogie';
      }
    }
  };

  var Fetcher = require('../lib/fetcher.js');

  var fetcher = new Fetcher({
    name: 'test',
    queuestore: {
      filename: 'queue-memory.js'
    }
  });

  var test_html = '<html><head><base href="http://example.com" /></head><body><h1>Test page</h1><ul><li><a href="http://example.com/page/1/">Page 1</a></li><li><a href="page/2/">Page 2</a></li></ul><span>product/45/</span><div><p id="text">This is sample text.</p><input id="input" value="Sample value" /><img id="image" src="image.jpg" />AN6RMH3GCS5952YCCQKS</div></body></html>';

  var queueItem = {
    url: 'http://www.google.com',
    callback: 'testAction'
  };

  it('jQuery returns jQuery object', function(done) {
    fetcher.getDom(
      test_html,
      function(dom) {
        expect(dom.$('h1').text()).toEqual('Test page');
        done();
      }
    );
  });

  it('Get base url', function(done) {
    fetcher.getDom(
      test_html,
      function(dom) {
        expect(fetcher.getBaseUrl(dom.$, queueItem)).toEqual('http://example.com/');
        dom.$('base').attr('href', 'http://example.com/');
        expect(fetcher.getBaseUrl(dom.$, queueItem)).toEqual('http://example.com/');
        dom.$('base').attr('href', 'http://example.com/test/');
        expect(fetcher.getBaseUrl(dom.$, queueItem)).toEqual('http://example.com/test/');
        dom.$('base').remove();
        expect(fetcher.getBaseUrl(dom.$, queueItem)).toEqual('http://www.google.com/');
        done();
      }
    );
  });

  it('Normalize url', function(done) {
    fetcher.getDom(
      test_html,
      function(dom) {
        expect(fetcher.normalizeUrl('test', dom.$, queueItem)).toEqual('http://example.com/test');
        dom.$('base').attr('href', 'http://example.com/example');
        expect(fetcher.normalizeUrl('test', dom.$, queueItem)).toEqual('http://example.com/example/test');
        dom.$('base').remove();
        expect(fetcher.normalizeUrl('test', dom.$, queueItem)).toEqual('http://www.google.com/test');
        done();
      }
    );
  });

  it('Processing links', function(done) {
    fetcher.getDom(
      test_html,
      function(dom) {
        fetcher.processLinks(
          {
            links: {
              test: 'a'
            }
          },
          dom.$,
          test_html,
          queueItem,
          function(error, links) {
            expect(links[0].url).toEqual('http://example.com/page/1/');
            expect(links[1].url).toEqual('http://example.com/page/2/');
            expect(links[0].callback).toEqual('test');
            expect(links[1].callback).toEqual('test');
            fetcher.processLinks(
              {
                links: {
                  test: /product\/45\//
                }
              },
              dom.$,
              test_html,
              queueItem,
              function(error, links) {
                expect(links[0].url).toEqual('http://example.com/product/45/');
                expect(links[0].callback).toEqual('test');
                done();
              }
            );
          }
        );
      }
    );
  });

  it('Processing data', function(done) {
    //Fetcher.prototype.processData = function(actions, $, html, queueItem, root) {
    fetcher.getDom(
      test_html,
      function(dom) {
        fetcher.processData(
          {
            data: mock.data
          },
          dom.$,
          test_html,
          queueItem,
          function(error, data) {
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

  // test blocks
  it('Process blocks', function(done) {
    fetcher.getDom(
      test_html,
      function(dom) {
        fetcher.processBlocks(
          {
            blocks: [{
              name: 'Block',
              root: 'ul li',
              data: {
                'test': 'a',
                'href': ['a', function($) { return $(this).attr('href'); }]
              }
            }]
          },
          dom.$,
          test_html,
          queueItem,
          function(error, results) {
            var block = results.Block;
            expect(block[0].test).toEqual('Page 1');
            expect(block[0].href).toEqual('http://example.com/page/1/');
            expect(block.length).toEqual(2);
            done();
          }
        );
      }
    );
  });

  it('Missing action should fail', function(done) {
   fetcher.processActions(
      null,
      '',
      queueItem,
      function(error, dataCollection) {
        expect(error).toEqual(true);
        done();
      }
    );
  });


  it('Processing actions', function(done) {
    fetcher.testAction = {
      data: mock.data,
      links: {
        home: 'a'
      }
    };
    fetcher.getDom(
      test_html,
      function(dom) {
        fetcher.processActions(
          dom.$,
          test_html,
          queueItem,
          function(error, dataCollection) {
            expect(error).toBeFalsy();
            expect(dataCollection.links[0].url).toEqual('http://example.com/page/1/');
            expect(dataCollection.data['jqnormalelement']).toEqual('This is sample text.');
            done();
          }
        );
      }
    );
  });

  it('Fetch http://www.google.com', function(done) {
    fetcher.fetch(
      queueItem,
      function(error, html, httpResponse) {
        expect(httpResponse.statusCode).toEqual(200);
        expect(error).toEqual(false);
        done();
      }
    );
  });
});
