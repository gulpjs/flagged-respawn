#!/usr/bin/env node

import flaggedRespawn from "../../index.js";
import v8flags from "v8flags";

// get a list of all possible v8 flags for the running version of node
v8flags(function (err, flags) {
  if (err) {
    console.error(err);
    return;
  }

  const { ready, child } = flaggedRespawn(flags, process.argv);
  var result = {
    ready: ready,
    child_pid: child.pid,
    process_pid: process.pid,
  };
  console.log(JSON.stringify(result));
});
