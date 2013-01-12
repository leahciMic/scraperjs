var crypto = require('crypto');
module.exports = function(str) {
	var hash;
	hash = crypto.createHash('sha1');
	hash.update(str);
	return hash.digest('hex');
};