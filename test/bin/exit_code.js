#!/usr/bin/env node

import flaggedRespawn from "../../index.js";

flaggedRespawn(["--harmony"], process.argv, function (ready) {
  if (ready) {
    setTimeout(function () {
      process.exit(100);
    }, 100);
  }
});
