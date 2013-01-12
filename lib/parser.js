var Fetcher;
Fetcher = (function() {
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
							this.queue.add(
								this.normalizeUrl(link, $, queueItem),
								action
							);
						}
					} else {
						$(selector).each(
							_.bind(
								function(index, element) {
									this.queue.add(
										this.normalizeUrl($(element).attr('href'), $, queueItem),
										action
									);
								},
								this
							)
						);
					}
				},
				this
			);
		}
	};
	Fetcher.prototype.processData = function(actions, $, html, queueItem, root) {
		var dataCollection = {};
		if ('data' in actions) {
			_.each(
				actions.data,
				function(selector, key) {
					var func, elements;
					if (_.isArray(selector)) {
						func = selector[1];
						selector = selector[0];
					}
					var match, flags = '';
					if (match = selector.match(/^\/(.*)\/([igm]){0,3}$/)) {
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
		return dataCollection;
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
			console.log(queueItem);
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
	function Fetcher() {
		this.queue = new QueueMemory();
	};
	return Fetcher;
})();
module.exports = Fetcher;
