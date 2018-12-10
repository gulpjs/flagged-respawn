#!/usr/bin/env node

var flaggedRespawn = require('../../');

flaggedRespawn(['--harmony'], process.argv, function(ready, child) {

  if (ready) {
    setTimeout(function() {
      process.exit();
    }, 100);
  } else {
    console.log('got child!');
    child.kill('SIGHUP');
  }

});
