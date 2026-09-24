#!/usr/bin/env node

import flaggedRespawn from "../../index.js";
import v8flags from "v8flags";

v8flags(function (err, flags) {
  if (err) {
    console.error(err);
    return;
  }

  const { ready, argv } = flaggedRespawn(flags, process.argv, [
    "--trace-deprecation",
  ]);
  if (ready) {
    console.log("cli args passed to app:", argv.join(" "));
  } else {
    console.log("Respawning!");
  }
});
