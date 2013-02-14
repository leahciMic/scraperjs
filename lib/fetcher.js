/**
 * Fetcher
 *
 * This class is responsible for processing the queue,
 * downloading web pages, and running the parser over the html,
 * and throwing the results at the data class
 *
 */

require('./oop.js');

var fs = require('fs'),
    _ = require('underscore'),
    restler = require('restler'),
    config = require('../config.js').get(),
    url = require('url'),
    Parser = require('./parser.js'),
    flow = require('flow-maintained'),
    async = require('async-leahcimic');

var clog = function(str) {
  if (config.debug)
    clog(str);
};

var Fetcher = function(options) {
  this.restler = restler;

  if (!_.isUndefined(options.name))
    this.name = options.name;

  var Queue = require('./' + options.queuestore.filename);
  var Datastore = require('./' + options.datastore.filename);
  this.queue = new Queue({fetcher: this.name});
  this.datastore = new Datastore(
    _.extend(
      config.datastore.options || {},
      {fetcher: this.name}
    )
  );

  if (typeof this.initialize == 'function')
    this.initialize();
};

_.extend(Fetcher.prototype, Parser);

Fetcher.extend = function(protoProps, classProps) {
  var child = __inherits(this, protoProps, classProps);
  child.extend = this.extend;
  return child;
};


Fetcher.prototype.start = function() {
  this.next();
};

Fetcher.prototype.callFetcher = function(html, queueItem, callback) {
  var fetcher = this;
  this.getDom(
    html,
    _.bind(
      function(dom) {
        this.processActions(
          dom.$,
          html,
          queueItem,
          function(error, dataCollection) {
            queueItem.fetcherCompletedAt = (new Date()).getTime();
            fetcher.queue.complete(
              queueItem,
              function() {
                callback(error, dataCollection);
              }
            );
            // free memory used by jsdom
            dom.close();
          }
        );
      },
      this
    )
  );
};

/**
 * Fetch the queueItem, and pass the results to the callback
 */
Fetcher.prototype.fetch = function(queueItem, callback) {
  queueItem.currentTry =
    typeof queueItem.currentTry == "number" ? queueItem.currentTry + 1 : 1;
  queueItem.startTime = (new Date()).getTime();
  this.restler.get(
    queueItem.url
  ).on(
    'complete',
    function(html, httpResponse) {
      queueItem.downloadCompleteAt = (new Date()).getTime();
      if (html instanceof Error)
        return callback(html, '', httpResponse);

      var error = undefined;

      if (httpResponse.statusCode >= 300 && httpResponse.statusCode <= 308)
        error = new Error('REDIRECTION');

      if (httpResponse.statusCode >= 400 && httpResponse.statusCode <= 499)
        error = new Error('CLIENT_ERROR');

      if (httpResponse.statusCode >= 500 && httpResponse.statusCode <= 599)
        error = new Error('SERVER_ERROR');

      callback(error, html, httpResponse);
    }
  );
};

/**
 * processNextQueueItem
 *
 * Takes the next item from the queue fetches it, and processes it
 *
 * @param {function} callback this callback should be completed once the item has been processed
 * @returns {boolean} true if ran, false if queue is empty
 */
Fetcher.prototype.processQueueItem = function(queueItem, callback) {
  var fetcher = this;
  async.auto(
    {
      fetch: function(callback, results) {
        fetcher.fetch(queueItem, callback);
      },
      data: ['fetch', function(callback, results) {
        var html = results.fetch[0];
        fetcher.callFetcher(
          html,
          queueItem,
          callback
        );
      }]
    },
    function(error, results) {
      var httpResponse = results.fetch ? results.fetch[1] || undefined : undefined,
          dataCollection = results.data || undefined;

      callback(
        error,
        dataCollection,
        httpResponse
      );
    }
  );
};

Fetcher.prototype.saveResults = function(queueItem, dataCollection, callback) {
  var fetcher = this;
  async.parallel(
    {
      links: function(callback) {
        if (_.has(dataCollection, 'links') && dataCollection.links.length)
          fetcher.queue.add(
            dataCollection.links,
            callback
          );
        else
          callback(false);
      },
      data: function(callback) {
        if (_.has(dataCollection, 'data') && _.keys(dataCollection.data).length)
          fetcher.datastore.add(
            queueItem,
            dataCollection.data,
            callback
          );
        else
          callback(false);
      }
    },
    function(error) {
      callback(error);
    }
  );
};

/**
 * Call the destroy function on queue/datastore if it exists
 */
Fetcher.prototype.destroy = function() {
  typeof this.datastore.destroy == 'function' && this.datastore.destroy();
  typeof this.queue.destroy == 'function' && this.queue.destroy();
};


Fetcher.prototype.handleError = function(error, queueItem, httpResponse, callback) {
  if (!queueItem.errors)
    queueItem.errors = [];

  queueItem.errors.push({
    error: error,
    time: new Date().getTime()
  });

  this.queue.update(
    queueItem,
    function(error) {
      callback(error);
    }
  );
};

Fetcher.prototype.doWork = function(callback) {
  var fetcher = this;
  async.auto(
    {
      queueItem: function(callback) {
        fetcher.queue.get(callback);
      },
      processQueueItem: ['queueItem', function(callback, results) {
        fetcher.processQueueItem(results.queueItem, callback);
      }],
      saveResults: ['processQueueItem', function(callback, results) {
        var dataCollection = results.processQueueItem[0];
        fetcher.saveResults(results.queueItem, dataCollection, callback);
      }]
    },
    function(error, results) {
      if (error && error.message != 'QUEUE_EMPTY') {
        var httpResponse = results.processQueueItem[1];
        return fetcher.handleError(
          error,
          results.queueItem,
          httpResponse,
          function(error) {
            callback(error, results.queueItem);
          }
        );
      }
      callback(error, results.queueItem);
    }
  );
};

/**
 * Responsible for starting the next cycle
 */
var queueEmptyCount = 0;
Fetcher.prototype.next = function() {
  var fetcher = this;
  this.doWork(function(error, queueItem) {
    var timeToWait = 2000; // default wait time
    if (error) {
      timeToWait = 0;
      if (error.message == 'QUEUE_EMPTY') {
        queueEmptyCount++;
        timeToWait = 5000;
        if (queueEmptyCount > 2) {
          console.log('Got QUEUE_EMPTY 3 times in a row');
          console.log(fetcher.name + ' finished');
          fetcher.destroy();
          return; // do not call next
        }
      } else
        queueEmptyCount = 0;
    } else {
      // wait how long it took to download / 3 ?
      timeToWait = (queueItem.downloadCompleteAt - queueItem.startTime) / 3;
    }
    if (!error)
       console.log('Memory: ' + (process.memoryUsage().rss / 1024 / 1024).toFixed(2) + 'Mb Finished ' + queueItem.url);
    else {
      console.log(error);
    }
    setTimeout(
      function() {
        fetcher.next();
      },
      timeToWait
    );
  });
};

Fetcher.extend = function(protoProps, classProps) {
  var child = __inherits(this, protoProps, classProps);
  child.extend = this.extend;
  return child;
};

module.exports = Fetcher;

/**
 at the end of each 'cycle' either update, or complete should be called,
 and not both. probably should add another one called fail, for items that
 fail because of too many errors. i like it!
 **/

// @todo CLIENT_ERROR we should allow any number of these, they'll be
// things like 404s etc. check for 404 3 times.

// @todo SERVER_ERROR we should monitor this, if we get too many in a row (3?)
// we should stop processing the queue and output an error. Many server errors
// probably indicate the server isn't returning proper results and is fucked atm

// @todo REDIRECTION_ERROR not really sure about this one yet, but i think
// it should probably add a 'aka' or 'history' of the urls this queueItem went
// through to arrive at the final location.
// not sure if the data should be stored under the latest url, or the original url
// obviously will need to think about how people will update there old urls
// to the new ones, for example, lowerspendings will probably want to update the
// url we hold to a product to match the latest url.
// datastore probably needs to hold some metadata (which actually it holds the queueItem already)
// so this might work out approriately, just need to keep it in mind.
