#!/usr/bin/env node

import flaggedRespawn from "../../index.js";

const { ready, child } = flaggedRespawn(["--harmony"], process.argv);
if (ready) {
  setTimeout(function () {
    process.exit();
  }, 100);
} else {
  console.log("got child!");
  child.kill("SIGHUP");
}
