#!/usr/bin/env node

const flaggedRespawn = require('../../');
const flags = ['--harmony'];

if (!flaggedRespawn.needed(flags)) {
  setTimeout(function() {
    process.exit();
  }, 100);
} else {
  var child = flaggedRespawn.execute(flags);
  child.kill('SIGHUP');
}
