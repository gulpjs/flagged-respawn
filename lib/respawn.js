const spawn = require('child_process').spawn;

module.exports = function (argv) {
  var child = spawn(argv[0], argv.slice(1));
  child.on('exit', function (code, signal) {
    process.on('exit', function () {
      if (signal) {
        process.kill(process.pid, signal);
      } else {
        process.exit(code);
      }
    });
  });
  child.stdout.pipe(process.stdout);
  child.stderr.pipe(process.stderr);
  return child;
};
