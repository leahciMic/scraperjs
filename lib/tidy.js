var spawn = require('child_process').spawn;
var fs = require('fs');

var tidy = (function() {
    this.html = function(str, callback) {
        var buffer = '';
        var error = '';

        if (!callback) {
            throw new Error('No callback provided for tidy.html');
        }
        var ptidy = spawn(
            'tidy',
            [
                '-m',
                '-utf8',
                '--quiet', 'y',
                '--show-warnings', 'n',
                '--preserve-entities', 'y',
                '--join-styles', 'n',
                '--lower-literals', 'n',
                '--char-encoding', 'utf8',
                '--force-output', 'yes'
            ]);

        ptidy.stdout.on('data', function (data) {
            buffer += data;
        });

        ptidy.stderr.on('data', function (data) {
            error += data;
        });

        ptidy.on('exit', function (code) {
            //fs.writeFileSync('last_tidy.html', buffer, 'binary');
            callback(buffer);
        });

        ptidy.stdin.write(str);
        ptidy.stdin.end();
    }
    return this;
})();

module.exports = tidy;