# ScraperJS

[![Build Status](https://travis-ci.org/leahciMic/scraperjs.png?branch=master)](https://travis-ci.org/leahciMic/scraperjs)

ScraperJS is an extensible JavaScript framework for scraping the web. It utilises cheerio (jQuery 
implementation for the server) or jQuery, and regular expressions to gather required data from a page. 
It provides basic functionality out of the box for simple scraping tasks, and this basic functionality
can be overridden for more complex tasks.

## Installation
	git clone https://github.com/leahciMic/ScraperJS.git
	cd ScraperJS
	npm install

## Running
	node main

## Fetchers
Fetchers are very easy to build, you can even write them in CoffeeScript.

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

	'links': {
		'div a': 'all',
		'/a href="([^"]*)"/': 'all'
	}
When using regular expressions, if 1 sub-query is used, ScraperJS will assume this to be the url to follow,
otherwise the entire matched expression is used.

#### data
The data property should contain regular expressions or jQuery expressions to specify the data to capture from
the current page.

	'data': {
		'Track Title': 'div.track span.title',
		'Track Duration': 'div.track span.duration',
		'Track Artist': 'div.track span.artist'
	}
	
#### blocks
Specifies blocks of repeating sections we would like to capture data from. The syntax is similar to the data property.

	'blocks': [
		'name': 'track',
		'root': 'div.track',
		'data': {
			'title': 'span.title',
			'duration': 'span.duration',
			'artist': 'span.artist'
		}
	]

### Example
This fetcher written in CoffeeScript, will download the title, link, upvotes, and downvotes of each Reddit
submission found on the front page. It will also traverse the popular sub-reddits found at the top of the page.

	class reddit extends ScraperJS
		home: 'links': 'div.sr-list ul.flat-list li a': 'home'
		blocks: [
			'name': 'Reddit Front Page',
			'root': 'div.thing:has(a.title)',
			'data':
				'title': 'a.title',
				'link': ['a.title', ($) -> $(this).attr('href')]
				'upvotes': ['', ($) -> $(this).attr('data-ups')]
				'downvotes': ['', ($) -> $(this).attr('data-downs')]
		]
		initialize: ->
			@queue.add 'http://www.reddit.com/', 'home'
