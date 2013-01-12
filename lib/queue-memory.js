var _ = require('underscore');

var QueueMemory = global.QueueMemory = function() {
	this.queue = [];
	this.urlsVisited = [];
	this.exists = function(url) {
		var exists = false;
		_.map(
			this.queue,
			function(queueItem) {
				if (url == queueItem.url)
					exists = true;
			},
			this
		);
		if (_.indexOf(this.urlsVisited, url) !== -1)
			exists = true;
		return exists;
	};
	this.length = function() {
		return this.queue.length;
	};
	this.add = function(url, callback) {
		if (_.isArray(url)) {
			_.map(
				url,
				function(url) {
					this.add(url, callback);
				},
				this
			);
		} else {
			// /(https?|ftp):\/\/(-\.)?([^\s\/?\.#-]+\.?)+(\/[^\s]*)?$/
			if (!this.exists(url))
				this.queue.push({url: url, callback: callback});
		}
		return true;
	};
	this.clear = function() {
		this.queue = [];
	};
	this.getAll = function() {
		return this.queue;
	};
	this.get = function() {
		var queueItem = this.queue.shift();
		if (_.isUndefined(queueItem))
			return false;
		this.urlsVisited.push(queueItem.url);
		return queueItem;
	}
};
module.exports = QueueMemory;
