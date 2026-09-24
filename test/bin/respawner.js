#!/usr/bin/env node

import flaggedRespawn from "../../index.js";
import v8flags from "v8flags";

// get a list of all possible v8 flags for the running version of node
v8flags(function (err, flags) {
  if (err) {
    console.error(err);
    return;
  }

  flaggedRespawn(flags, process.argv, function (ready, child) {
    if (ready) {
      console.log("Running!");
    } else {
      console.log("Special flags found, respawning.");
    }
    if (child.pid !== process.pid) {
      console.log("Respawned to PID: " + child.pid);
    }
  });
});
