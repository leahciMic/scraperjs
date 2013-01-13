describe('Fetcher', function() {
  var Fetcher = require('../lib/fetcher.js');
  var fetcher = new Fetcher({name: 'test'});
  it('Fetch http://google.com', function(done) {
    runs(function() {
      var queueItem = {
        url: 'http://www.google.com',
        callback: 'test'
      };
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
