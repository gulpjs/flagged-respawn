#!/usr/bin/env node

import flaggedRespawn from "../../index.js";

const { ready } = flaggedRespawn(["--harmony"], process.argv);
if (ready) {
  setTimeout(function () {
    process.exit(100);
  }, 100);
}
