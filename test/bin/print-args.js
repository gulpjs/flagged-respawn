#!/usr/bin/env node

var flaggedRespawn = require('../..');
var v8flags = require('v8flags');

v8flags(function(err, flags) {
  if (err) {
    console.error(err);
    return;
  }

  flaggedRespawn(flags, process.argv, [
    '--trace-deprecation',
/*
    '--require',
    'v8flags',
    '--v8-pool-size=2',
*/
  ], function(ready, child, args) {
    if (ready) {
      console.log('cli args passed to app:', args.join(' '));
    } else {
      console.log('Respawning!');
    }
  });
});

