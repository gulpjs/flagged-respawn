#!/usr/bin/env node

var flaggedRespawn = require('../../');
var v8flags = require('v8flags');

// get a list of all possible v8 flags for the running version of node
v8flags(function(err, flags) {
  if (err) {
    console.error(err);
    return;
  }

  flaggedRespawn(flags, process.argv, ['--trace-deprecation'], function(ready) {
    if (ready) {
      console.log('Running!');
    } else {
      console.log('Respawning!');
    }
  });
});

