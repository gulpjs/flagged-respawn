var assert = require('assert');
var test = require('node:test');
var describe = test.describe;
var it = test.it;
var exec = require('child_process').exec;
var os = require('os');
var path = require('path');

var reorder = require('../lib/reorder');
var isV8flags = require('../lib/is-v8flags');
var remover = require('../lib/remover');
var flaggedRespawn = require('../');

describe('flaggedRespawn', function () {
  var flags = ['--harmony', '--use-strict', '--stack-size'];

  describe('isV8flags', function () {
    it('should return true when flag is in v8flags', function () {
      assert.strictEqual(isV8flags('--harmony', flags), true);
      assert.strictEqual(isV8flags('--use-strict', flags), true);
      assert.strictEqual(isV8flags('--stack-size', flags), true);
    });

    it('should return false when flag is not in v8flags', function () {
      assert.strictEqual(isV8flags('--aaa', flags), false);
      assert.strictEqual(isV8flags('__use_strict', flags), false);
    });
  });

  describe('reorder', function () {
    it('should re-order args, placing special flags first', function () {
      var needsRespawn = ['node', 'file.js', '--flag', '--harmony', 'command'];
      var noRespawnNeeded = ['node', 'bin/flagged-respawn', 'thing'];
      assert.deepStrictEqual(reorder(flags, needsRespawn), [
        'node',
        '--harmony',
        'file.js',
        '--flag',
        'command',
      ]);
      assert.deepStrictEqual(reorder(flags, noRespawnNeeded), noRespawnNeeded);
    });

    it('should keep flags values when not placed first', function () {
      var args = ['node', 'file.js', '--stack-size=2048'];
      var expected = ['node', '--stack-size=2048', 'file.js'];
      assert.deepStrictEqual(reorder(flags, args), expected);
    });

    it('should ignore special flags when they are in the correct position', function () {
      var args = ['node', '--harmony', 'file.js', '--flag'];
      assert.deepStrictEqual(reorder(flags, reorder(flags, args)), args);
    });

    it('defaults to process.argv if none specified', function () {
      assert.deepStrictEqual(reorder(flags), process.argv);
    });
  });

  describe('remover', function () {
    it('should remove args included in flags', function () {
      var needsRespawn = ['node', 'file.js', '--flag', '--harmony', 'command'];
      var noRespawnNeeded = ['node', 'bin/flagged-respawn', 'thing'];
      assert.deepStrictEqual(remover(flags, needsRespawn), [
        'node',
        'file.js',
        '--flag',
        'command',
      ]);
      assert.deepStrictEqual(reorder(flags, noRespawnNeeded), noRespawnNeeded);
    });

    it('should remove a arg even when the arg has value', function () {
      var args = ['node', 'file.js', '--stack-size=2048'];
      var expected = ['node', 'file.js'];
      assert.deepStrictEqual(remover(flags, args), expected);
    });

    it('should remove special flags when they are in the correct position', function () {
      var args = ['node', '--harmony', 'file.js', '--flag'];
      var expected = ['node', 'file.js', '--flag'];
      assert.deepStrictEqual(reorder(flags, remover(flags, args)), expected);
    });
  });

  describe('main export', function () {
    it('should throw if no flags are specified', function () {
      assert.throws(function () {
        flaggedRespawn();
      });
    });

    it('should throw if no argv is specified', function () {
      assert.throws(function () {
        flaggedRespawn(flags);
      });
    });

    it('should respawn and pipe stderr/stdout to parent', function (t, done) {
      exec('node ./test/bin/respawner.js --harmony', function (err, stdout) {
        assert.strictEqual(
          stdout.replace(/[0-9]/g, ''),
          'Special flags found, respawning.\nRespawned to PID: \nRunning!\n',
        );
        done();
      });
    });

    it('should respawn and pass exit code from child to parent', function (t, done) {
      exec('node ./test/bin/exit_code.js --harmony', function (err) {
        assert.strictEqual(err.code, 100);
        done();
      });
    });

    it('should respawn; if child is killed, parent should exit with same signal', function (t, done) {
      // Because CI and nyc hates this
      if (process.env.NYC_PARENT_PID || process.env.NYC_PROCESS_ID) {
        this.skip();
        return;
      }

      exec('node ./test/bin/signal.js --harmony', function (err) {
        switch (os.platform()) {
          // err.signal is null on Windows and Linux.
          // Is this related to the issue #12378 of nodejs/node?
          case 'win32':
          case 'linux': {
            assert.strictEqual(err.signal, null);
            break;
          }
          default: {
            assert.strictEqual(err.signal, 'SIGHUP');
            break;
          }
        }
        done();
      });
    });

    it('should call back with ready as true when respawn is not needed', function (t, done) {
      var argv = ['node', './test/bin/respawner'];
      flaggedRespawn(flags, argv, function (ready) {
        assert.strictEqual(ready, true);
        done();
      });
    });

    it('should call back with ready as false when respawn is needed', function (t, done) {
      var argv = ['node', './test/bin/callback-params', '--harmony'];
      exec(argv.join(' '), function (err, stdout, stderr) {
        assert.strictEqual(err, null);
        assert.strictEqual(stderr, '');
        var results = stdout.slice(0, -1).split('\n');
        assert.strictEqual(results.length, 2);
        assert.strictEqual(JSON.parse(results[0]).ready, false);
        assert.strictEqual(JSON.parse(results[1]).ready, true);
        done();
      });
    });

    it('should call back with the child process when ready', function (t, done) {
      var argv = ['node', './test/bin/callback-params', '--harmony'];
      exec(argv.join(' '), function (err, stdout, stderr) {
        assert.strictEqual(err, null);
        assert.strictEqual(stderr, '');
        var results = stdout.slice(0, -1).split('\n');
        assert.strictEqual(results.length, 2);

        var params = JSON.parse(results[0]);
        assert.notStrictEqual(params.child_pid, params.process_pid);

        params = JSON.parse(results[1]);
        assert.strictEqual(params.child_pid, params.process_pid);
        done();
      });
    });

    it('should call back with own process when respawn not needed', function (t, done) {
      var argv = ['node', './test/bin/respawner'];
      flaggedRespawn(flags, argv, function (ready, child) {
        assert.strictEqual(child.pid, process.pid);
        done();
      });
    });
  });

  describe('force and forbid respawning', function () {
    it('forbid respawning with --no-respawning flag', function (t, done) {
      var cmd = [
        'node',
        path.resolve(__dirname, 'bin/respawner.js'),
        '--harmony',
        '--no-respawning',
      ].join(' ');

      exec(cmd, function cb(err, stdout, stderr) {
        assert.strictEqual(err, null);
        assert.strictEqual(stderr, '');
        assert.strictEqual(stdout, 'Running!\n');
        done();
      });
    });

    it('always forbid respawning with inner --no-respawning', function (t, done) {
      var cmd = [
        'node',
        path.resolve(__dirname, 'bin/forbid-respawning.js'),
        '--harmony',
      ].join(' ');

      exec(cmd, function cb(err, stdout, stderr) {
        assert.strictEqual(err, null);
        assert.strictEqual(stderr, '');
        assert.strictEqual(stdout, 'Running!\n');
        done();
      });
    });

    it('should force respawning with node flags (array)', function (t, done) {
      var cmd = [
        'node',
        path.resolve(__dirname, 'bin/force-respawning.js'),
      ].join(' ');

      exec(cmd, function cb(err, stdout, stderr) {
        assert.strictEqual(err, null);
        assert.strictEqual(stderr, '');
        assert.strictEqual(stdout, 'Respawning!\nRunning!\n');
        done();
      });
    });

    it('should force respawning with node flags (string)', function (t, done) {
      var cmd = [
        'node',
        path.resolve(__dirname, 'bin/force-respawning-string.js'),
      ].join(' ');

      exec(cmd, function cb(err, stdout, stderr) {
        assert.strictEqual(err, null);
        assert.strictEqual(stderr, '');
        assert.strictEqual(stdout, 'Respawning!\nRunning!\n');
        done();
      });
    });

    it('should take priority to forbidding than forcing', function (t, done) {
      exec('node ./test/bin/force-and-forbid-respawning.js', cb);

      function cb(err, stdout, stderr) {
        assert.strictEqual(err, null);
        assert.strictEqual(stderr, '');
        assert.strictEqual(stdout, 'Running!\n');
        done();
      }
    });
  });

  describe('cli args which are passed to app', function () {
    it('should pass args except v8flags, forced node flags, --no-respawning when respawned', function (t, done) {
      var script = path.resolve(__dirname, 'bin/print-args.js');
      var cmd = [
        '"' + process.argv[0] + '"',
        script,
        'aaa',
        '--harmony',
        '-q',
        '1234',
        '--cwd',
        'bbb/ccc/ddd',
        '--prof-browser-mode',
        '-V',
      ].join(' ');

      var message =
        'Respawning!\n' +
        'cli args passed to app: ' +
        [
          process.argv[0],
          script,
          'aaa',
          '-q',
          '1234',
          '--cwd',
          'bbb/ccc/ddd',
          '-V',
        ].join(' ') +
        '\n';

      exec(cmd, function cb(err, stdout, stderr) {
        assert.strictEqual(err, null);
        assert.strictEqual(stderr, '');
        assert.strictEqual(stdout, message);
        done();
      });
    });

    it('should pass args except v8flags, forced node flags, --no-respawning when not respawned', function (t, done) {
      var script = path.resolve(__dirname, 'bin/print-args.js');
      var cmd = [
        '"' + process.argv[0] + '"',
        script,
        'aaa',
        '--harmony',
        '-q',
        '1234',
        '--cwd',
        'bbb/ccc/ddd',
        '--prof-browser-mode',
        '-V',
        '--no-respawning',
      ].join(' ');

      var message =
        'cli args passed to app: ' +
        [
          process.argv[0],
          script,
          'aaa',
          '-q',
          '1234',
          '--cwd',
          'bbb/ccc/ddd',
          '-V',
        ].join(' ') +
        '\n';

      exec(cmd, function cb(err, stdout, stderr) {
        assert.strictEqual(err, null);
        assert.strictEqual(stderr, '');
        assert.strictEqual(stdout, message);
        done();
      });
    });
  });

  describe('parameter checks', function () {
    it('should throw an error when flags is nullish', function () {
      var argv = ['node', './test/bin/respawner'];
      var exec = function () {};

      assert.throws(function () {
        flaggedRespawn(null, argv, exec);
      });

      assert.throws(function () {
        flaggedRespawn(flags, undefined, exec);
      });
    });

    it('will not respawn if forced flags is not string or array', function (t, done) {
      var argv = ['node', './test/bin/respawner'];

      flaggedRespawn(flags, argv, {}, function (ready, child) {
        assert.strictEqual(ready, true);
        assert.strictEqual(child.pid, process.pid);
        done();
      });
    });
  });
});
