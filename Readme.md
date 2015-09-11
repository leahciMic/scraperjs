# ScraperJS

[![Build Status](https://travis-ci.org/leahciMic/scraperjs.png?branch=master)](https://travis-ci.org/leahciMic/scraperjs) [![Flattr this git repo](http://api.flattr.com/button/flattr-badge-large.png)](https://flattr.com/submit/auto?user_id=leahciMic&url=https://github.com/leahciMic/scraperjs&title=scraperjs&language=javascript&tags=github&category=software)

## Current state
ScraperJS is currently a work in progress, and is not yet ready to be used. However, feel free to
check out the code, fork it, submit pull requests. Make suggestions, and add issues.

ScraperJS is an extensible JavaScript framework for scraping the web. It utilises jQuery, and regular expressions to gather required data from a web page. 
It provides basic functionality out of the box for simple scraping tasks, and this basic functionality
can be overridden for more complex tasks.

## Installation
	git clone https://github.com/leahciMic/scraperjs.git
	cd scraperjs
	npm install

## Running
	node index.js
	
## Tests
	npm test
	
## Queues

Queues are responsible for keeping state of the backlog of urls to scrape.

## Datastores
Datastores are responsible for storing data returned from a fetcher.

## Fetchers
Fetchers are collections of instructions that define what data should be returned from the scraping job.
Each queue item will contain a callback which is a property on the fetcher object. This callback can either
be a function for manual processing, or an object consiting of jQuery/regex expressinos.

### Extending ScraperJS to create a fetcher
	reddit = ScraperJS.extend({
	});

### Adding an url to the queue
	this.queue.add('http://www.example.com/', 'callback');
	
You will most likely want to use this in the initialize method to add the first url.

### Methods
#### Initialize
Initialize is ran when the fetcher is instantiated. Prefect for adding start urls etc.

### Properties
#### links
The links property should contain regular expressions or jQuery expressions to explain the links to follow on 
the current page.

	links: {
		jquery: 'div a',
		regex: /a href="([^"]*)"/
	}
When using regular expressions, if 1 sub-query is used, ScraperJS will assume this to be the url to follow,
otherwise the entire matched expression is used.

#### data
The data property should contain regular expressions or jQuery expressions to specify the data to capture from
the current page.

	data: {
		'Track Title': 'div.track span.title',
		'Track Duration': 'div.track span.duration',
		'Track Artist': 'div.track span.artist'
	}
	
#### blocks
Specifies blocks of repeating sections we would like to capture data from. The syntax is similar to the data property.

	blocks: [
		name: 'track',
		root: 'div.track',
		data: {
			title: 'span.title',
			duration: 'span.duration',
			artist: 'span.artist'
		}
	]

### Example
This fetcher written in CoffeeScript, will download the title, link, upvotes, and downvotes of each Reddit
submission found on the front page. It will also traverse the popular sub-reddits found at the top of the page.

	class reddit extends ScraperJS
		home: links: home: 'div.sr-list ul.flat-list li a'
		blocks: [
			name: 'Reddit Front Page',
			root: 'div.thing:has(a.title)',
			data:
				title: 'a.title',
				link: ['a.title', ($) -> $(this).attr('href')]
				upvotes: ['', ($) -> $(this).attr('data-ups')]
				downvotes: ['', ($) -> $(this).attr('data-downs')]
		]
		initialize: ->
			@queue.add 'http://www.reddit.com/', 'home'
