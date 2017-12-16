#!/usr/bin/env node

const flaggedRespawn = require('../..');
const v8flags = require('v8flags');
const path = require('path');

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
  ], function (ready, child, args) {
    if (ready) {
      console.log('cli args passed to app:', args.join(' '));
    } else {
      console.log('Respawning!');
    }
  });
});

