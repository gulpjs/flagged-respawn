#!/usr/bin/env node

const flaggedRespawn = require('../../');
const flags = ['--harmony'];

if (!flaggedRespawn.needed(flags)) {
  setTimeout(function() {
    process.exit();
  }, 1000);
} else {
  var child = flaggedRespawn.execute(flags);
  child.kill('SIGHUP');
}
