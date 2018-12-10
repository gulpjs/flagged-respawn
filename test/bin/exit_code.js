#!/usr/bin/env node

var flaggedRespawn = require('../../');

flaggedRespawn(['--harmony'], process.argv, function(ready) {

  if (ready) {
    setTimeout(function() {
      process.exit(100);
    }, 100);
  }

});
