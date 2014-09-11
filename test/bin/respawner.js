#!/usr/bin/env node

const flaggedRespawn = require('../../');
const flags = ['--harmony'];

if (!flaggedRespawn.needed(flags)) {
  console.log('running.');
} else {
  console.log('respawning.');
  flaggedRespawn.execute(flags);
}
