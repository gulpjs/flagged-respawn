const spawn = require('child_process').spawn;
const reorder = require('./lib/reorder');

exports.needed = function needed (flags, argv) {
  var shouldRespawn = false;
  if (!argv) {
    argv = process.argv;
  }
  return (JSON.stringify(argv) !== JSON.stringify(reorder(flags, argv)));
};

exports.execute = function execute (flags, argv) {
  if (!flags) {
    throw new Error('You must specify flags to respawn with.');
  }
  if (!argv) {
    argv = process.argv;
  }
  var args = reorder(flags, argv);
  var child = spawn(args[0], args.slice(1));
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
