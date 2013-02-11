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
    async = require('async');

var clog = function(str) {
  if (config.debug)
    clog(str);
};

var Fetcher = function(options) {
  // @todo refactor this into the queue
  this.completedJobs = [];

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
  queueItem.currentTry = 1;
  queueItem.startTime = (new Date()).getTime();
  restler.get(
    queueItem.url
  ).on(
    'complete',
    function(html, httpResponse) {
      queueItem.downloadCompleteAt = (new Date()).getTime();
      callback(html instanceof Error, html, httpResponse);
    }
  );
};

/**
 * processOneItemFromQueue
 *
 * Takes the next item from the queue fetches it, and processes it
 *
 * @param {function} callback this callback should be completed once the item has been processed
 * @returns {boolean} true if ran, false if queue is empty
 */
Fetcher.prototype.processOneItemFromQueue = function(callback) {
  var fetcher = this;
  this.queue.get(function(error, queueItem) {
    if (!queueItem)
      return callback(new Error('QUEUE_EMPTY'));
    fetcher.fetch(
      queueItem,
      _.bind(
        function(error, html, httpResponse) {
          if (!!error) {
            callback(error, queueItem, httpResponse);
            return;
          }
          this.callFetcher(
            html,
            queueItem,
            function(error, dataCollection) {
              callback(error, queueItem, dataCollection);
            }
          );
        },
        fetcher
      )
    );
  });
};

Fetcher.prototype.doWork = function(callback) {
  var fetcher = this;
  this.processOneItemFromQueue(
    function(error, queueItem, dataCollection) {
      if (error) {
        return callback(error);
      }
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
          callback(error, queueItem);
        }
      );
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

/**
 * Responsible for starting the next cycle
 */
var queueEmptyCount = 0;
Fetcher.prototype.next = function() {
  var fetcher = this;
  this.doWork(function(error, queueItem) {
    var timeToWait = 2000; // default wait time

    if (!!error) {
      timeToWait = 5000;
        timeToWait = 15000;
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