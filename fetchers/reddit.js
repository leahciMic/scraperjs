var Fetcher = require('../lib/fetcher.js');

var reddit = Fetcher.extend({
	home: {
		'links': {
			'div.sr-list ul.flat-list li a': 'home'
		},
		'blocks': [{
			'name': 'posts',
			'root': 'div.thing:has(a.title)',
			'data': {
				'title': 'a.title',
				'link': ['a.title', function($) { return $(this).attr('href'); }],
				'upvotes': ['', function($) { return $(this).attr('data-ups'); }],
				'downvotes': ['', function($) { return $(this).attr('data-downs'); }]
			}
		}]
	},
	initialize: function() {
		this.queue.add(
			{url: 'http://www.reddit.com/', callback: 'home'}
		);
	}
});

module.exports = reddit;