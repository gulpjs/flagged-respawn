#!/usr/bin/env node

const flaggedRespawn = require('../../');
const v8flags = require('v8flags');

// get a list of all possible v8 flags for the running version of node
v8flags(function(err, flags) {
  if (err) {
    console.error(err);
    return;
  }

  var argv = process.argv.concat('--no-respawning');

  flaggedRespawn(flags, argv, ['--trace-deprecation'], true, function (ready, child) {
    if (ready) {
      console.log('Running!');
    } else {
      console.log('Respawning!');
    }
  });
});

