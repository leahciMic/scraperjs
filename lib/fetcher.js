/**
 * Fetcher
 * 
 * This class is responsible for processing the queue,
 * downloading web pages, and running the parser over the html,
 * and throwing the results at the data class
 * 
 */

var jquery = require('jquery');
var jsdom = require('jsdom');

var flow = require('flow');
var fs = require('fs');
var _ = require('underscore');
var restler = require('restler');

var Config = require('../config.js');
var config = Config.get();

var Queue = require('./' + config.queue);

var url = require('url');

var clog = function(str) {
	if (config.debug)
		clog(str);
};

Fetcher = function(config) {
	// @todo refactor this into the queue
	this.completedJobs = [];
	this.queue = new Queue();

	if (!_.isUndefined(config.name))
		this.name = config.name;

	if (typeof this.initialize != 'undefined')
		this.initialize();

	// start processing queue
};

/**
 * getjQuery returns a jQuery object based on result
 */
Fetcher.prototype.getjQuery = function(html, callback) {
	jsdom.env({
		html: html,
		done: function(errors, window) {
			var $ = jquery.create(window);
			$.destroy = function() {
				window.close();
			};
			callback($);
		}
	});
};
	
Fetcher.prototype.normalizeUrl = function(url, $, queueItem) {
	if (url.indexOf('://') == -1) {
		if (url.substring(0, 1) == '/')
			url = url.substring(1);
		url = this.getBaseUrl($, queueItem) + url;
	}
	return url;
};

Fetcher.prototype.getBaseUrl = function($, queueItem) {
	var base_url = $('base').attr('href');
	if (_.isUndefined(base_url)) {
		base_url = url.parse(queueItem.url);
		base_url = base_url.protocol + '//' +  base_url.host;
	}
	if (base_url.substr(-1, 1) != '/')
		base_url += '/';
	return base_url;
};

Fetcher.prototype.processLinks = function(actions, $, html, queueItem) {
	var links = [];
	if ('links' in actions) {
		_.each(
			actions.links,
			function(action, selector) {
				var match, flags = '', link;
				if (match = selector.match(/^\/(.*)\/([igm]){0,3}$/)) {
					if (!_.isUndefined(match[2]))
						flags = match[2];
					var regex = new RegExp(match[1], flags + 'g');
					while ((match = regex.exec(html)) !== null) {
						if (match.length == 2)
							link = match[1];
						else
							link = match[0];
						links.push({
							url: this.normalizeUrl(link, $, queueItem),
							callback: action
						});
					}
				} else {
					$(selector).each(
						_.bind(
							function(index, element) {
								links.push({
									url: this.normalizeUrl($(element).attr('href'), $, queueItem),
									callback: action
								});
							},
							this
						)
					);
				}
			},
			this
		);
	}
	return links;
};
Fetcher.prototype.processData = function(actions, $, html, queueItem, callback, root) {
	var dataCollection = {};
	if ('data' in actions) {
		_.each(
			actions.data,
			function(selector, key) {
				var func, elements;
				if (_.isFunction(selector)) {
					dataCollection[key] = selector.call(match, $, this, html, queueItem);
				}
				if (_.isArray(selector)) {
					func = selector[1];
					selector = selector[0];
				}
				var match, flags = '';
				if (!_.isFunction(selector) && (match = selector.match(/^\/(.*)\/([igm]){0,3}$/))) {
					if (!_.isUndefined(match[2]))
						flags = match[2];
					var regex = new RegExp(match[1], flags + 'g');
					while ((match = regex.exec(html)) !== null) {
						if (_.isFunction(func)) {
							dataCollection[key] = func.call(match, $, this, html, queueItem);
						} else {
							dataCollection[key] = match[0];
						}
					}
				} else {
					if (_.isUndefined(root))
						root = 'html';
					if (selector == '') {
						elements = $(root);
					}
					else
						elements = $(root).find(selector);
					elements.each(
						_.bind(
							function(index, element) {
								if (_.isFunction(func)) {
									dataCollection[key] = func.call(element, $, this, html, queueItem);
								} else {
									switch ($(element)[0].nodeName.toLowerCase()) {
										case 'img':
											dataCollection[key] = $(element).attr('src');
											break;
										case 'input':
										case 'textarea':
											dataCollection[key] = $(element).val();
											break;
										default:
											dataCollection[key] = $(element).html();
									}
								}
							},
							this
						)
					);
				}
			},
			this
		);
	}
	callback(dataCollection);
};
Fetcher.prototype.processBlocks = function(actions, $, html, queueItem) {
	var dataCollection = {};
	if ('blocks' in actions) {
		_.each(
			actions.blocks,
			function (block) {
				dataCollection[block.name] = [];
				if (!_.isUndefined(block.root))
					block.elements = $(block.root);
				$(block.elements).each(
					_.bind(
						function(index, element) {
							var _html = $(element).html();
							dataCollection[block.name].push(this.processData(block, $, _html, queueItem, element));
						},
						this
					)
				);
			},
			this
		);
	}
	return dataCollection;
};
Fetcher.prototype.processActions = function($, html, callback, queueItem) {
	var actions = this[queueItem.callback];

	if (_.isUndefined(actions)) {
		clog(queueItem);
		throw 'fuck';
	}
	var dataCollection = {};
	if (_.isObject(actions)) {
		this.processLinks(actions, $, html);
		dataCollection = this.processData(actions, $, html, queueItem);
		_.extend(
			dataCollection,
			this.processBlocks(actions, $, html, queueItem)
		);
	} else if (_.isFunction(actions)) {
		// @todo This will not work
		actions.call(this, $, html, callback, queueItem);
	}
	var dataObject = {};
	if (Object.keys(dataCollection).length > 0)
		dataObject.data = dataCollection;
	if (this.queue.length())
		dataObject.links = this.queue.getAll()
	this.queue.clear();
	callback(dataObject);
};
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
	var timeTaken = (new Date()).getTime() - queueItem.startTime;
	this.getJquery(
		html,
		function($) {
			this.processActions($, html, queueItem, _.bind(
				function() {
					var waitTime = Math.ceil(timeTaken / 3);
					clog(this.name + ': finished in ' + timeTaken + 'ms, waiting ' + waitTime + 'ms');
					// @todo is this really the place to call next() ?
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
	);
};

// @todo move retry logic out of this function
Fetcher.prototype.processResult = function(result, queueItem) {
	clog(this.name + ': completed');
	if (result instanceof Error) {
		queueItem.startTime = (new Date()).getTime();
		var retryTime = Math.pow(2, queueItem.currentTry) * 1000;
		clog(this.name + ': failed. Attempt: #' + queueItem.currentTry + ', retrying in ' + queueItem.retryTime);
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
Fetcher.prototype.fetch = function(queueItem, callback) {
	queueItem.currentTry = 1;
	queueItem.startTime = (new Date()).getTime();

	clog(this.name + ': fetching ' + queueItem.url);

	restler.get(
		queueItem.url
	).on(
		'complete',
		function(html, request) {
			callback(html, request);
		}
	);
};

Fetcher.prototype.processOneItemFromQueue = function(callback) {
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
Fetcher.prototype.next = function() {
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

Fetcher.extend = function(protoProps, classProps) {
	var child = __inherits(this, protoProps, classProps);
	child.extend = this.extend;
	return child;
};

module.exports = Fetcher;