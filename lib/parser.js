var Parser = {},
    jsdom = require('jsdom'),
    async = require('async'),
    flow = require('flow-maintained'),
    _ = require('underscore'),
    url = require('url'),
    fs = require('fs'),
    jquery = fs.readFileSync('contrib/jquery-1.9.0.min.js', 'utf8');

/**
 * getDom returns a jsdom instance with jquery loaded
 */
Parser.getDom = function(html, callback) {
  jsdom.env({
    html: html,
    src: [jquery],
    done: function(errors, dom) {
      callback(dom);
    }
  });
};

Parser.normalizeUrl = function(url, $, queueItem) {
  if (url.indexOf('://') == -1) {
    if (url.substring(0, 1) == '/')
      url = url.substring(1);
    url = this.getBaseUrl($, queueItem) + url;
  }
  return url;
};

Parser.getBaseUrl = function($, queueItem) {
  var base_url = $('base').attr('href');
  if (_.isUndefined(base_url)) {
    base_url = url.parse(queueItem.url);
    base_url = base_url.protocol + '//' +  base_url.host;
  }
  if (base_url.substr(-1, 1) != '/')
    base_url += '/';
  return base_url;
};

Parser.processLinks = function(actions, $, html, queueItem, callback) {
  var links = [];

  if ('links' in actions) {
    _.each(
      actions.links,
      function(selector, action) {
        var flags = '',
            link;

        if (selector instanceof RegExp) {
          flags += selector.ignoreCase ? 'i' : ''
                 + selector.multiline ? 'm' : '';

          var regex = new RegExp(selector.source, flags + 'g');

          while ((match = regex.exec(html)) !== null) {
            link = match.length == 2 ? link = match[1] : match[0];
            links.push({
              url: this.normalizeUrl(link, $, queueItem),
              callback: action
            });
          };
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

  callback(false, links);
};

Parser.processData = function(actions, $, html, queueItem, callback, root) {
  var dataCollection = {};
  if ('data' in actions) {
    _.each(
      actions.data,
      function(selector, key) {
        var func, elements;
        // @todo needs to be asynchronous
        if (_.isFunction(selector)) {
          dataCollection[key] = selector.call(this, $, html, queueItem);
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
  callback(false, dataCollection);
};

Parser.processBlocks = function(actions, $, html, queueItem, callback) {
  var dataCollection = {};
  var fetcher = this;

  if ('blocks' in actions) {
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
                  function(error, data) {
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
          callback(false, dataCollection);
        });
      }
    );
  } else {
    callback(false, dataCollection);
  }
};

Parser.processActions = function($, html, queueItem, callback) {
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
        callback(false, {data: data, links: links});
      }
    );
  } else if (_.isObject(fetcherRules)) {
    async.parallel(
      {
        data: function(callback) {
          _this.processData(fetcherRules, $, html, queueItem, callback);
        },
        links: function(callback) {
          _this.processLinks(fetcherRules, $, html, queueItem, callback);
        },
        blocks: function(callback) {
          _this.processBlocks(fetcherRules, $, html, queueItem, callback);
        }
      },
      function(error, results) {
          dataCollection.links = results.links;
        _.extend(dataCollection.data, results.data);
        _.extend(dataCollection.data, results.blocks);
        callback(error, dataCollection);
      }
    );

  } else {
    throw new Error('Fetcher callback ' + queueItem.callback + ' not found');
  }
};

module.exports = Parser;