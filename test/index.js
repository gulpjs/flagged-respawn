const expect = require('chai').expect;
const exec = require('child_process').exec;

const reorder = require('../lib/reorder');
const flaggedRespawn = require('../');

describe('flaggedRespawn', function () {

  describe('reorder', function () {

    it('should re-order args, placing special flags first', function () {
      var needsRespawn = ['node', 'file.js', '--flag', '--harmony', 'command'];
      var noRespawnNeeded = ['node', 'bin/flagged-respawn', 'thing'];
      expect(reorder(['--harmony'], needsRespawn))
        .to.deep.equal(['node', '--harmony', 'file.js', '--flag', 'command']);
      expect(reorder(['--harmony'], noRespawnNeeded))
        .to.deep.equal(noRespawnNeeded);
    });

  });

  describe('needed', function () {
    it('should throw if no flags are specified', function () {
      expect(function () { flaggedRespawn.needed(); }).to.throw;
    });

    it('should return false if no specified flags are in process.argv', function () {
      expect(flaggedRespawn.needed(['--harmony'])).to.be.false;
    });

    it('should return true if any specified flags are in process.argv', function () {
      // the -R comes from npm test
      expect(flaggedRespawn.needed(['-R'])).to.be.true;
    });
  });

  describe('execute', function () {

    it('should throw if no flags are specified', function () {
      expect(function () { flaggedRespawn.execute(); }).to.throw;
    });

    it('should respawn and pipe stderr/stdout to parent', function (done) {
      exec('node ./test/bin/respawner.js --harmony', function (err, stdout, stderr) {
        expect(stdout).to.equal('respawning.\nrunning.\n');
        done();
      });
    });

    it('should respawn and pass exit code from child to parent', function (done) {
      exec('node ./test/bin/exit_code.js --harmony', function (err, stdout, stderr) {
        expect(err.code).to.equal(100);
        done();
      });
    });

    it('should respawn; if child is killed, signal should be sent from child to parent on exit', function (done) {
      exec('node ./test/bin/signal.js --harmony', function (err, stdout, stderr) {
        expect(err.signal).to.equal('SIGHUP');
        done();
      });
    });
  });

});
