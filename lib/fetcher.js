var flow = require('flow');
var fs = require('fs');

// @todo This should be extended in the right way as to allow us to plug in any
// html processor
var Phantomjs = require(BASE_PATH + '/lib/phantom-driver.js');
var phantomjs = new Phantomjs;

ScraperJS = function(config) {
	var instance = this;
	this.queue = new queue;
	this.data = new DataMemory;
	this.queue.scraper = this;
	this.data.scraper = this;
	this.completedJobs = [];

	ScraperJS.prototype.start = function() {
		this.next();
	};

	ScraperJS.prototype.sync = function() {
		var completedJobs = this.completedJobs;
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

	ScraperJS.prototype.persistData = function() {

	};

	ScraperJS.prototype.callFetcher = function(html, queueItem, callback) {
		phantomjs.process(
			html,
			this.name,
			_.bind(
				function(data) {
					// @todo Do something with the collected data
					// data may contain, data: and links: (@todo what do blocks look like, are they working?)
					// when both of these complete, we need to mark it off as completed
					this.completedJobs.push(queueItem.url);

					if (Object.keys(data).indexOf('links') != -1 && data.links.length) {
						_.each(
							data.links,
							function(linkItem) {
								this.queue.add(
									linkItem.url,
									linkItem.callback
								)
							},
							this
						);
					}

					if (Object.keys(data).indexOf('data') != -1 && data.data.length) {
						this.data.add(
							queueItem.url,
							data.data
						);
					}
					callback();
				},
				this
			),
			queueItem
		);
		callback();
		return;
		console.log(html, queueItem, callback);
		var timeTaken = (new Date()).getTime() - queueItem.startTime;
		$ = this.getjQueryish(result);
		this.processActions($, result, queueItem, _.bind(
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
	}
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
	}
	ScraperJS.prototype.fetch = function(queueItem) {
		queueItem.currentTry = 1;
		queueItem.startTime = (new Date()).getTime();
		console.log(this.name + ': fetching ' + queueItem.url);
		restler.get(
			queueItem.url
		).on(
			'complete',
			_.bind(
				function(result) {
					this.processResult(result, queueItem);
				},
				this
			)
		);
	}
	ScraperJS.prototype.next = function() {
		var queueItem = this.queue.get();
		if (!queueItem) {
			setTimeout(
				_.bind(
					function() {
						this.next();
					},
					this
				),
				2000
			);
			return;
		}

		this.fetch(queueItem);
	}
	if (!_.isUndefined(config.name))
		this.name = config.name;
	if (typeof this.initialize != 'undefined')
		this.initialize();
	this.start();
	setInterval(
		_.bind(
			this.sync,
			this
		),
		3000
	);
};
ScraperJS.extend = function(protoProps, classProps) {
	var child = __inherits(this, protoProps, classProps);
	child.extend = this.extend;
	return child;
}
module.exports = ScraperJS;
