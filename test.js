const expect = require('chai').expect;

const reorder = require('./lib/reorder');

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

});
