var expect = require('expect');
var exec = require('child_process').exec;
var os = require('os');
var path = require('path');

var reorder = require('../lib/reorder');
var isV8flags = require('../lib/is-v8flags');
var remover = require('../lib/remover');
var flaggedRespawn = require('../');

describe('flaggedRespawn', function() {
  var flags = ['--harmony', '--use_strict', '--stack_size'];

  describe('isV8flags', function() {
    it('should return true when flag is in v8flags', function(done) {
      expect(isV8flags('--harmony', flags)).toEqual(true);
      expect(isV8flags('--use_strict', flags)).toEqual(true);
      expect(isV8flags('--stack_size', flags)).toEqual(true);
      done();
    });

    it('should ignore separator differences of "-" and "_"', function(done) {
      expect(isV8flags('--use-strict', flags)).toEqual(true);
      expect(isV8flags('--stack-size', flags)).toEqual(true);
      done();
    });

    it('should return false when flag is not in v8flags', function(done) {
      expect(isV8flags('--aaa', flags)).toEqual(false);
      expect(isV8flags('__use_strict', flags)).toEqual(false);
      done();
    });
  });

  describe('reorder', function() {

    it('should re-order args, placing special flags first', function(done) {
      var needsRespawn = ['node', 'file.js', '--flag', '--harmony', 'command'];
      var noRespawnNeeded = ['node', 'bin/flagged-respawn', 'thing'];
      expect(reorder(flags, needsRespawn)).toEqual(['node', '--harmony', 'file.js', '--flag', 'command']);
      expect(reorder(flags, noRespawnNeeded)).toEqual(noRespawnNeeded);
      done();
    });

    it('should keep flags values when not placed first', function(done) {
      var args = ['node', 'file.js', '--stack_size=2048'];
      var expected = ['node', '--stack_size=2048', 'file.js'];
      expect(reorder(flags, args)).toEqual(expected);
      done();
    });

    it('should re-order args when flag separators are dashes', function(done) {
      var args = ['node', 'file.js', '--stack-size=2048'];
      var expected = ['node', '--stack-size=2048', 'file.js'];
      expect(reorder(flags, args)).toEqual(expected);
      done();
    });

    it('should ignore special flags when they are in the correct position', function(done) {
      var args = ['node', '--harmony', 'file.js', '--flag'];
      expect(reorder(flags, reorder(flags, args))).toEqual(args);
      done();
    });

    it('defaults to process.argv if none specified', function(done) {
      expect(reorder(flags)).toEqual(process.argv);
      done();
    });

  });

  describe('remover', function() {
    it('should remove args included in flags', function(done) {
      var needsRespawn = ['node', 'file.js', '--flag', '--harmony', 'command'];
      var noRespawnNeeded = ['node', 'bin/flagged-respawn', 'thing'];
      expect(remover(flags, needsRespawn)).toEqual(['node', 'file.js', '--flag', 'command']);
      expect(reorder(flags, noRespawnNeeded)).toEqual(noRespawnNeeded);
      done();
    });

    it('should remove a arg even when the arg has value', function(done) {
      var args = ['node', 'file.js', '--stack_size=2048'];
      var expected = ['node', 'file.js'];
      expect(remover(flags, args)).toEqual(expected);
      done();
    });

    it('should remove special flags when they are in the correct position', function(done) {
      var args = ['node', '--harmony', 'file.js', '--flag'];
      var expected = ['node', 'file.js', '--flag'];
      expect(reorder(flags, remover(flags, args))).toEqual(expected);
      done();
    });
  });

  describe('main export', function() {

    it('should throw if no flags are specified', function(done) {
      expect(function() { flaggedRespawn(); }).toThrow();
      done();
    });

    it('should throw if no argv is specified', function(done) {
      expect(function() { flaggedRespawn(flags); }).toThrow();
      done();
    });

    it('should respawn and pipe stderr/stdout to parent', function(done) {
      exec('node ./test/bin/respawner.js --harmony', function(err, stdout) {
        expect(stdout.replace(/[0-9]/g, '')).toEqual('Special flags found, respawning.\nRespawned to PID: \nRunning!\n');
        done();
      });
    });

    it('should respawn and pass exit code from child to parent', function(done) {
      exec('node ./test/bin/exit_code.js --harmony', function(err) {
        expect(err.code).toEqual(100);
        done();
      });
    });

    it('should respawn; if child is killed, parent should exit with same signal', function(done) {
      // Because travis and nyc hates this
      if (process.env.TRAVIS || process.env.NYC_PARENT_PID) {
        this.skip();
        return;
      }

      exec('node ./test/bin/signal.js --harmony', function(err) {
        switch (os.platform()) {
          // err.signal is null on Windows and Linux.
          // Is this related to the issue #12378 of nodejs/node?
          case 'win32':
          case 'linux': {
            expect(err.signal).toEqual(null);
            break;
          }
          default: {
            expect(err.signal).toEqual('SIGHUP');
            break;
          }
        }
        done();
      });
    });

    it('should call back with ready as true when respawn is not needed', function(done) {
      var argv = ['node', './test/bin/respawner'];
      flaggedRespawn(flags, argv, function(ready) {
        expect(ready).toEqual(true);
      });
      done();
    });

    it('should call back with ready as false when respawn is needed', function(done) {
      var argv = ['node', './test/bin/callback-params', '--harmony'];
      exec(argv.join(' '), function(err, stdout, stderr) {
        expect(err).toEqual(null);
        expect(stderr).toEqual('');
        var results = stdout.slice(0, -1).split('\n');
        expect(results.length).toEqual(2);
        expect(JSON.parse(results[0]).ready).toEqual(false);
        expect(JSON.parse(results[1]).ready).toEqual(true);
        done();
      });
    });

    it('should call back with the child process when ready', function(done) {
      var argv = ['node', './test/bin/callback-params', '--harmony'];
      exec(argv.join(' '), function(err, stdout, stderr) {
        expect(err).toEqual(null);
        expect(stderr).toEqual('');
        var results = stdout.slice(0, -1).split('\n');
        expect(results.length).toEqual(2);

        var params = JSON.parse(results[0]);
        expect(params.child_pid).toNotEqual(params.process_pid);

        params = JSON.parse(results[1]);
        expect(params.child_pid).toEqual(params.process_pid);
        done();
      });
    });

    it('should call back with own process when respawn not needed', function(done) {
      var argv = ['node', './test/bin/respawner'];
      flaggedRespawn(flags, argv, function(ready, child) {
        expect(child.pid).toEqual(process.pid);
      });

      done();
    });

  });

  describe('force and forbid respawning', function() {
    it('forbid respawning with --no-respawning flag', function(done) {
      var cmd = [
        'node',
        path.resolve(__dirname, 'bin/respawner.js'),
        '--harmony',
        '--no-respawning',
      ].join(' ');

      exec(cmd, function cb(err, stdout, stderr) {
        expect(err).toEqual(null);
        expect(stderr).toEqual('');
        expect(stdout).toEqual('Running!\n');
        done();
      });
    });

    it('always forbid respawning with inner --no-respawning', function(done) {
      var cmd = [
        'node',
        path.resolve(__dirname, 'bin/forbid-respawning.js'),
        '--harmony',
      ].join(' ');

      exec(cmd, function cb(err, stdout, stderr) {
        expect(err).toEqual(null);
        expect(stderr).toEqual('');
        expect(stdout).toEqual('Running!\n');
        done();
      });
    });

    it('should force respawning with node flags (array)', function(done) {
      var cmd = [
        'node',
        path.resolve(__dirname, 'bin/force-respawning.js'),
      ].join(' ');

      exec(cmd, function cb(err, stdout, stderr) {
        expect(err).toEqual(null);
        expect(stderr).toEqual('');
        expect(stdout).toEqual('Respawning!\nRunning!\n');
        done();
      });
    });

    it('should force respawning with node flags (string)', function(done) {
      var cmd = [
        'node',
        path.resolve(__dirname, 'bin/force-respawning-string.js'),
      ].join(' ');

      exec(cmd, function cb(err, stdout, stderr) {
        expect(err).toEqual(null);
        expect(stderr).toEqual('');
        expect(stdout).toEqual('Respawning!\nRunning!\n');
        done();
      });
    });

    it('should take priority to forbidding than forcing', function(done) {
      exec('node ./test/bin/force-and-forbid-respawning.js', cb);

      function cb(err, stdout, stderr) {
        expect(err).toEqual(null);
        expect(stderr).toEqual('');
        expect(stdout).toEqual('Running!\n');
        done();
      }
    });
  });

  describe('cli args which are passed to app', function() {

    it('should pass args except v8flags, forced node flags, --no-respawning when respawned', function(done) {
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
        '--prof_browser_mode',
        '-V',
      ].join(' ');

      var message = 'Respawning!\n' +
        'cli args passed to app: ' +
        [process.argv[0], script, 'aaa', '-q', '1234', '--cwd', 'bbb/ccc/ddd', '-V'].join(' ') +
        '\n';

      exec(cmd, function cb(err, stdout, stderr) {
        expect(err).toEqual(null);
        expect(stderr).toEqual('');
        expect(stdout).toEqual(message);
        done();
      });
    });

    it('should pass args except v8flags, forced node flags, --no-respawning when not respawned', function(done) {
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

      var message = 'cli args passed to app: ' + [
        process.argv[0],
        script,
        'aaa',
        '-q',
        '1234',
        '--cwd',
        'bbb/ccc/ddd',
        '-V',
      ].join(' ') + '\n';

      exec(cmd, function cb(err, stdout, stderr) {
        expect(err).toEqual(null);
        expect(stderr).toEqual('');
        expect(stdout).toEqual(message);
        done();
      });
    });

  });

  describe('parameter checks', function() {

    it('should throw an error when flags is nullish', function(done) {
      var argv = ['node', './test/bin/respawner'];
      var exec = function() {};

      expect(function() {
        flaggedRespawn(null, argv, exec);
      }).toThrow(Error);

      expect(function() {
        flaggedRespawn(flags, undefined, exec);
      }).toThrow(Error);

      done();
    });

    it('will not respawn if forced flags is not string or array', function(done) {
      var argv = ['node', './test/bin/respawner'];

      flaggedRespawn(flags, argv, {}, function(ready, child) {
        expect(ready).toEqual(true);
        expect(child.pid).toEqual(process.pid);
        done();
      });
    });
  });

});
