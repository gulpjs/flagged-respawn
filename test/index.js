const expect = require('chai').expect;
const exec = require('child_process').exec;
const os = require('os');
const path = require('path');

const reorder = require('../lib/reorder');
const isV8flags = require('../lib/is-v8flags');
const remover = require('../lib/remover');
const flaggedRespawn = require('../');

describe('flaggedRespawn', function () {
  var flags = ['--harmony', '--use_strict', '--stack_size']

  describe('isV8flags', function() {
    it('should return true when flag is in v8flags', function() {
      expect(isV8flags('--harmony', flags)).to.be.true;
      expect(isV8flags('--use_strict', flags)).to.be.true;
      expect(isV8flags('--stack_size', flags)).to.be.true;
    });

    it('should ignore separator differences of "-" and "_"', function() {
      expect(isV8flags('--use-strict', flags)).to.be.true;
      expect(isV8flags('--stack-size', flags)).to.be.true;
    });

    it('should return false when flag is not in v8flags', function() {
      expect(isV8flags('--aaa', flags)).to.be.false;
      expect(isV8flags('__use_strict', flags)).to.be.false;
    });
  });

  describe('reorder', function () {

    it('should re-order args, placing special flags first', function () {
      var needsRespawn = ['node', 'file.js', '--flag', '--harmony', 'command'];
      var noRespawnNeeded = ['node', 'bin/flagged-respawn', 'thing'];
      expect(reorder(flags, needsRespawn))
        .to.deep.equal(['node', '--harmony', 'file.js', '--flag', 'command']);
      expect(reorder(flags, noRespawnNeeded))
        .to.deep.equal(noRespawnNeeded);
    });

    it('should keep flags values when not placed first', function () {
      var args = ['node', 'file.js', '--stack_size=2048'];
      var expected = ['node', '--stack_size=2048', 'file.js'];
      expect(reorder(flags, args)).to.deep.equal(expected);
    });

    it('should re-order args when flag separators are dashes', function() {
      var args = ['node', 'file.js', '--stack-size=2048'];
      var expected = ['node', '--stack-size=2048', 'file.js'];
      expect(reorder(flags, args)).to.deep.equal(expected);
    });

    it('should ignore special flags when they are in the correct position', function () {
      var args = ['node', '--harmony', 'file.js', '--flag'];
      expect(reorder(flags, reorder(flags, args))).to.deep.equal(args);
    });

  });

  describe('remover', function() {
    it('should remove args included in flags', function() {
      var needsRespawn = ['node', 'file.js', '--flag', '--harmony', 'command'];
      var noRespawnNeeded = ['node', 'bin/flagged-respawn', 'thing'];
      expect(remover(flags, needsRespawn))
        .to.deep.equal(['node', 'file.js', '--flag', 'command']);
      expect(reorder(flags, noRespawnNeeded))
        .to.deep.equal(noRespawnNeeded);
    });

    it('should remove a arg even when the arg has value', function() {
      var args = ['node', 'file.js', '--stack_size=2048'];
      var expected = ['node', 'file.js'];
      expect(remover(flags, args)).to.deep.equal(expected);
    });

    it('should remove special flags when they are in the correct position', function () {
      var args = ['node', '--harmony', 'file.js', '--flag'];
      var expected = ['node', 'file.js', '--flag'];
      expect(reorder(flags, remover(flags, args))).to.deep.equal(expected);
    });
  });

  describe('execute', function () {

    it('should throw if no flags are specified', function () {
      expect(function () { flaggedRespawn.execute(); }).to.throw;
    });

    it('should throw if no argv is specified', function () {
      expect(function () { flaggedRespawn.execute(flags); }).to.throw;
    });

    it('should respawn and pipe stderr/stdout to parent', function (done) {
      exec('node ./test/bin/respawner.js --harmony', function (err, stdout, stderr) {
        expect(stdout.replace(/[0-9]/g, '')).to.equal('Special flags found, respawning.\nRespawned to PID: \nRunning!\n');
        done();
      });
    });

    it('should respawn and pass exit code from child to parent', function (done) {
      exec('node ./test/bin/exit_code.js --harmony', function (err, stdout, stderr) {
        expect(err.code).to.equal(100);
        done();
      });
    });

    it('should respawn; if child is killed, parent should exit with same signal', function (done) {
      // Because travis and nyc hates this
      if (process.env.TRAVIS || process.env.NYC_PARENT_PID) {
        this.skip();
        return;
      }

      exec('node ./test/bin/signal.js --harmony', function (err, stdout, stderr) {
        console.log('err', err);
        console.log('stdout', stdout);
        console.log('stderr', stderr);

        switch (os.platform()) {
          // err.signal is null on Windows and Linux.
          // Is this related to the issue #12378 of nodejs/node?
          case 'win32':
          case 'linux': {
            expect(err.signal).to.equal(null);
            break;
          }
          default: {
            expect(err.signal).to.equal('SIGHUP');
            break;
          }
        }
        done();
      });
    });

    it('should call back with ready as true when respawn is not needed', function () {
      var argv = ['node', './test/bin/respawner'];
      flaggedRespawn(flags, argv, function (ready) {
        expect(ready).to.be.true;
      });
    });

    it('should call back with ready as false when respawn is needed', function (done) {
      var argv = ['node', './test/bin/callback-params', '--harmony'];
      exec(argv.join(' '), function(err, stdout, stderr) {
        expect(err).to.equal(null);
        expect(stderr).to.equal('');
        var results = stdout.slice(0, -1).split('\n');
        expect(results.length).to.equal(2);
        expect(JSON.parse(results[0]).ready).to.be.false;
        expect(JSON.parse(results[1]).ready).to.be.true;
        done();
      });
    });

    it('should call back with the child process when ready', function (done) {
      var argv = ['node', './test/bin/callback-params', '--harmony'];
      exec(argv.join(' '), function(err, stdout, stderr) {
        expect(err).to.equal(null);
        expect(stderr).to.equal('');
        var results = stdout.slice(0, -1).split('\n');
        expect(results.length).to.equal(2);

        var params = JSON.parse(results[0]);
        expect(params.child_pid).to.not.equal(params.process_pid);

        params = JSON.parse(results[1]);
        expect(params.child_pid).to.equal(params.process_pid);
        done();
      });
    });

    it('should call back with own process when respawn not needed', function () {
      var argv = ['node', './test/bin/respawner'];
      flaggedRespawn(flags, argv, function (ready, child) {
        expect(child.pid).to.equal(process.pid);
      });
    });

  });

  describe('force and forbid respawning', function() {
    it('forbid respawning with --no-respawning flag', function(done) {
      var cmd = [
        'node',
        path.resolve(__dirname, 'bin/respawner.js'),
        '--harmony',
        '--no-respawning',
      ].join(' ');;

      exec(cmd, function cb(err, stdout, stderr) {
        expect(err).to.equal(null);
        expect(stderr).to.equal('');
        expect(stdout).to.equal('Running!\n');
        done();
      });
    });

    it('always forbid respawning with inner --no-respawning', function(done) {
      var cmd = [
        'node',
        path.resolve(__dirname, 'bin/forbid-respawning.js'),
        '--harmony',
      ].join(' ');;

      exec(cmd, function cb(err, stdout, stderr) {
        expect(err).to.equal(null);
        expect(stderr).to.equal('');
        expect(stdout).to.equal('Running!\n');
        done();
      });
    });

    it('should force respawning with node flags', function(done) {
      var cmd = [
        'node',
        path.resolve(__dirname, 'bin/force-respawning.js'),
      ].join(' ');;

      exec(cmd, function cb(err, stdout, stderr) {
        expect(err).to.equal(null);
        expect(stderr).to.equal('');
        expect(stdout).to.equal('Respawning!\nRunning!\n');
        done();
      });
    });

    it('should take priority to forbidding than forcinge', function(done) {
      exec('node ./test/bin/force-and-forbid-respawning.js', cb);

      function cb(err, stdout, stderr) {
        expect(err).to.equal(null);
        expect(stderr).to.equal('');
        expect(stdout).to.equal('Running!\n');
        done();
      }
    });
  });

  describe('cli args which are passed to app', function() {

    it('should pass args except v8flags, forced node flags, --no-respawning when respawned', function(done) {
      var script = path.resolve(__dirname, 'bin/print-args.js');
      var cmd = [
        process.argv[0],
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

      exec(cmd, function cb(err, stdout, stderr) {
        expect(err).to.equal(null);
        expect(stderr).to.equal('');
        expect(stdout).to.equal('Respawning!\n' +
          'cli args passed to app: ' + [
          process.argv[0],
          script,
          'aaa',
          '-q',
          '1234',
          '--cwd',
          'bbb/ccc/ddd',
          '-V',
        ].join(' ') + '\n');
        done();
      });
    });

    it('should pass args except v8flags, forced node flags, --no-respawning when not respawned', function(done) {
      var script = path.resolve(__dirname, 'bin/print-args.js');
      var cmd = [
        process.argv[0],
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
      ].join(' ');;

      exec(cmd, function cb(err, stdout, stderr) {
        expect(err).to.equal(null);
        expect(stderr).to.equal('');
        expect(stdout).to.equal(
          'cli args passed to app: ' + [
          process.argv[0],
          script,
          'aaa',
          '-q',
          '1234',
          '--cwd',
          'bbb/ccc/ddd',
          '-V',
        ].join(' ') + '\n');
        done();
      });
    });

  });

  describe('parameter checks', function() {

    it('should throw an error when flags is nullish', function() {
      var argv = ['node', './test/bin/respawner'];
      var exec = function() {};

      expect(function() {
        flaggedRespawn(null, argv, exec);
      }).throws(Error);

      expect(function() {
        flaggedRespawn(flags, undefined, exec);
      }).throws(Error);
    });

    it('should not respawn if forced flags is not an array', function(done) {
      var argv = ['node', './test/bin/respawner'];

      flaggedRespawn(flags, argv, '--harmony', function(ready, child) {
        expect(ready).to.be.true;
        expect(child.pid).to.equal(process.pid);
        done();
      });
    });
  });

});
