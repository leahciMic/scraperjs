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
    Queue = require('./' + config.queue),
    url = require('url'),
    Parser = require('./parser.js');

var clog = function(str) {
  if (config.debug)
    clog(str);
};

var Fetcher = function(config) {
  // @todo refactor this into the queue
  this.completedJobs = [];
  this.queue = new Queue();

  if (!_.isUndefined(config.name))
    this.name = config.name;

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

// @todo refactor this into the queue
Fetcher.prototype.sync = function() {
  var completedJobs = this.completedJobs;
  var instance = this;
  this.completedJobs = [];

  flow.exec(
    function() {
      instance.queue.sync(this.MULTI('queue'));
    },
    function() {
      instance.data.sync(this.MULTI('data'));
    },
    function(results) {
      /**
       * Once both have sync'd to the server,
       * we can safely assume it's ok to mark
       * the jobs as done
       */
      console.warn('We are done here');
      process.exit();
    }
  );

  this.queue.fetchQueue();
};

Fetcher.prototype.callFetcher = function(html, queueItem, callback) {
  this.getjQuery(
    html,
    function($) {
      this.processActions(
        $,
        html,
        queueItem,
        function(error, data, links) {
          queueItem.fetcherCompletedAt = (new Date()).getTime();
          callback(error, data, links);
        }
      );
    }
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
  var queueItem = this.queue.get();

  if (!queueItem)
    return false;

  this.fetch(
    queueItem,
    _.bind(
      function(error, html, httpResponse) {
        if (error) {
          callback(error, queueItem, httpResponse);
          return;
        }
        this.callFetcher(
          html, 
          queueItem, 
          function(error, data, links) {
            callback(error, queueItem, data, links);
          }
        );
      },
      this
    )   
  );

  return true;
};

/**
 * Responsible for starting the next cycle
 */
Fetcher.prototype.next = function() {
  // no records in the queueItem, try again in 2 secs
  if (!this.processOneItemFromQueue(
    function(error, queueItem, data, links) {
      if (error) {
        // an error occurred so try again logic should go here
        console.log('An error occurred');
      } else {
        // success, so how long do we we wait
        console.log('We are done here');
        console.log(arguments);
      }
    }
  )) {
    // nothing in the queue, wait 10 seconds and try again
    setTimeout(
      _.bind(
        function() {
          this.next();
        },
        this
      ),
      10000
    );
  }
};

Fetcher.extend = function(protoProps, classProps) {
  var child = __inherits(this, protoProps, classProps);
  child.extend = this.extend;
  return child;
};

module.exports = Fetcher;