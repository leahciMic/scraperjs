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

var flow = require('flow-maintained');
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

	if (typeof this.initialize == 'function')
		this.initialize();
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

Fetcher.prototype.processLinks = function(actions, $, html, queueItem, callback) {
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
	process.nextTick(function() {
		callback(links);
	});
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
	process.nextTick(function() {
		callback(dataCollection);
	});
};

Fetcher.prototype.processBlocks = function(actions, $, html, queueItem, callback) {
	var dataCollection = {};
	var fetcher = this;

	if ('blocks' in actions) {
		// @todo need to update this to be asynchronous
		flow.exec(
			function() {
				var flow = this;
				_.each(
					actions.blocks,
					function (block) {
						dataCollection[block.name] = [];
						if (!_.isUndefined(block.root))
							block.elements = $(block.root);
						$(block.elements).each(
							function(index, element) {
								var cb = flow.MULTI();
								var _html = $(element).html();
								fetcher.processData(
									block, 
									$, 
									_html, 
									queueItem,
									function(data) {
										dataCollection[block.name].push(data);
										cb();
									},
									element
								);
							}
						);
					}
				);
			},
			function() {
				process.nextTick(function() {
					callback(dataCollection);	
				});
			}
		);
	} else {
		process.nextTick(function() {
			callback(dataCollection);
		})
	}
};

Fetcher.prototype.processActions = function($, html, queueItem, callback) {
	var fetcherRules = this[queueItem.callback];
	var _this = this;

	if (_.isUndefined(fetcherRules)) {
		callback(true);
		return;
	}

	var dataCollection = {
		links: [],
		data: {}
	};

	if (_.isFunction(fetcherRules)) {
		fetcherRules.call(
			this,
			$,
			html,
			queueItem,
			function(data, links) {
				callback(true, {data: data, links: links});
			}
		);
	} else if (_.isObject(fetcherRules)) {
		flow.exec(
			function() {
				_this.processData(fetcherRules, $, html, queueItem, this.MULTI('data'));
				_this.processLinks(fetcherRules, $, html, queueItem, this.MULTI('links'));
				//_this.processBlocks(fetcherRules, $, html, queueItem, this.MULTI('blocks'));
			},
			function(results) {
				dataCollection.links = results.links;
				_.extend(dataCollection.data, results.data);
				//_.extend(dataCollection.data, results.blocks);
				callback(false, dataCollection);
			}
		);
	}
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
	this.getJquery(
		html,
		function($) {
			this.processActions($, html, queueItem, function(error, data, links) {
				queueItem.fetcherCompletedAt = (new Date()).getTime();
				callback(true);
			});
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
					function(error) {
						callback(error, queueItem);
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
		function(error, queueItem) {
			if (error) {
				// an error occurred so try again logic should go here
			} else {
				// success, so how long do we we wait
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