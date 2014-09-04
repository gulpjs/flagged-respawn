#!/usr/bin/env node

const flaggedRespawn = require('../');

// get a list of all possible v8 flags to intercept
const v8flags = require('v8flags').fetch();

// check to see if any defined flags are in the wrong position
// if we didn't want to support all v8 flags, we could just as
// easily do if (!flaggedRespawn.needed(['--harmony'])) instead.
if (!flaggedRespawn.needed(v8flags)) {
  // If we are here, no respawn was needed a.k.a no special flags
  // were seen, or this is the child process that was spawned by
  // the first run.
  console.log('Running!');
} else {
  // respawn so the above branch is entered
  console.log('Respawning...');
  flaggedRespawn.execute(v8flags);
}
