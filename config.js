Config = (function() {
  require('./contrib/math.uuid.js');
  var fs = require('fs');
  var sha1 = require('./contrib/sha1.js');
  var _ = require('underscore');
  function Config() {
    this.defaults = {
      data: 'datastore-file.js',
      queue: 'queue-memory.js',
      device: this.generateDeviceId(),
      method: 'phantom'
    };
    this.load();
    this.applyDefaults();
    this.save();
  };

  Config.prototype.generateDeviceId = function() {
    return sha1(Math.uuid());
  };

  Config.prototype.applyDefaults = function() {
    _.defaults(
      this.config,
      this.defaults
    );
  };

  Config.prototype.get = function(key) {
    if (typeof key == 'undefined')
      return this.config;
    if (Object.hasOwnProperty.call(this.config, key))
      return this.config[key];
    return undefined;
  };

  Config.prototype.set = function(key, value) {
    Object[key] = value;
  };

  Config.prototype.load = function() {
    console.log('Reading configuration...');
    try {
      this.config = JSON.parse(
        fs.readFileSync('config.json', 'utf8')
      );
      return true;
    } catch (error) {
      this.config = {}
      return false;
    }
  };

  Config.prototype.save = function() {
    fs.writeFileSync('config.json', JSON.stringify(this.config), 'utf8');
  };

  return Config;
})();

module.exports = new Config();
