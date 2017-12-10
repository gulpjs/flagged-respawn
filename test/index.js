const expect = require('chai').expect;
const exec = require('child_process').exec;
const os = require('os');

const reorder = require('../lib/reorder');
const flaggedRespawn = require('../');

describe('flaggedRespawn', function () {
  var flags = ['--harmony', '--use_strict', '--stack_size']

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

    it('should ignore special flags when they are in the correct position', function () {
      var args = ['node', '--harmony', 'file.js', '--flag'];
      expect(reorder(flags, reorder(flags, args))).to.deep.equal(args);
    });

    it('defaults to process.argv if none specified', function () {
      expect(reorder(flags)).to.deep.equal(process.argv);
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
  });

});
