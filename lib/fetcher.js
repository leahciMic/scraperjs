/**
 * Fetcher
 * 
 * This class is responsible for processing the queue,
 * downloading web pages, and running the parser over the html,
 * and throwing the results at the data class
 * 
 */

var flow = require('flow');
var fs = require('fs');
var _ = require('underscore');
var restler = require('restler');

var Config = require('../config.js');
var config = Config.get();

var Queue = require('./' + config.queue);

ScraperJS = function(config) {
	// @todo refactor this into the queue
	this.completedJobs = [];
	this.queue = new Queue();

	if (!_.isUndefined(config.name))
		this.name = config.name;

	if (typeof this.initialize != 'undefined')
		this.initialize();

	// start processing queue
};

ScraperJS.prototype.start = function() {
	this.next();
};

// @todo refactor this into the queue
ScraperJS.prototype.sync = function() {
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

ScraperJS.prototype.callFetcher = function(html, queueItem, callback) {
	var timeTaken = (new Date()).getTime() - queueItem.startTime;
	$ = this.getjQueryish(html);
	this.processActions($, html, queueItem, _.bind(
		function() {
			var waitTime = Math.ceil(timeTaken / 3);
			console.log(this.name + ': finished in ' + timeTaken + 'ms, waiting ' + waitTime + 'ms');
			setTimeout(
				_.bind(
					function() {
						this.next();
					},
					this
				),
				waitTime
			);
		},
		this
	));
};

ScraperJS.prototype.processResult = function(result, queueItem) {
	console.log(this.name + ': completed');
	if (result instanceof Error) {
		queueItem.startTime = (new Date()).getTime();
		var retryTime = Math.pow(2, queueItem.currentTry) * 1000;
		console.log(this.name + ': failed. Attempt: #' + queueItem.currentTry + ', retrying in ' + queueItem.retryTime);
		queueItem.currentTry++;
		this.retry(retryTime); // try again after 5 sec
	} else {
		callback = _.bind(
			function() {
				this.next();
			},
			this
		);
		this.callFetcher(result, queueItem, callback);
	}
};

/**
 * Fetch the queueItem, and pass the results to the callback
 */
ScraperJS.prototype.fetch = function(queueItem, callback) {
	queueItem.currentTry = 1;
	queueItem.startTime = (new Date()).getTime();

	console.log(this.name + ': fetching ' + queueItem.url);

	restler.get(
		queueItem.url
	).on(
		'complete',
		function(html, request) {
			callback(html, request);
		}
	);
};

ScraperJS.prototype.processOneItemFromQueue = function(callback) {
	var queueItem = this.queue.get();

	if (!queueItem)
		return false;

	this.fetch(
		queueItem,
		_.bind(
			function(result) {
				this.processResult(result, queueItem);
			},
			this
		)		
	);

	return true;
};

/**
 * Next, processes the next record from the queue
 */
ScraperJS.prototype.next = function() {
	// no records in the queueItem, try again in 2 secs
	if (!this.processOneItemFromQueue(
		process.nextTick(_.bind(this.next, this))
	)) {
		// there was nothing to process
		setTimeout(
			_.bind(
				function() {
					this.next();
				},
				this
			),
			2000
		);
	}	
};

ScraperJS.extend = function(protoProps, classProps) {
	var child = __inherits(this, protoProps, classProps);
	child.extend = this.extend;
	return child;
};

module.exports = ScraperJS;