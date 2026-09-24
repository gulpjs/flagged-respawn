import reorder from "./lib/reorder.js";
import respawn from "./lib/respawn.js";
import remover from "./lib/remover.js";

const FORBID_RESPAWNING_FLAG = "--no-respawning";

function isNotForbidRespawningFlag(arg) {
  return arg !== FORBID_RESPAWNING_FLAG;
}

export default function flaggedRespawn(flags, argv, forcedFlags) {
  if (!flags) {
    throw new Error("You must specify flags to respawn with.");
  }
  if (!argv) {
    throw new Error("You must specify an argv array.");
  }

  if (typeof forcedFlags === "string") {
    forcedFlags = [forcedFlags];
  }

  if (!Array.isArray(forcedFlags)) {
    forcedFlags = [];
  }

  let child = process;

  if (argv.includes(FORBID_RESPAWNING_FLAG)) {
    argv = argv.filter(isNotForbidRespawningFlag);
    argv = remover(flags, argv);
    return { ready: true, child, argv };
  }

  let reordered = reorder(flags, argv);
  let ready = JSON.stringify(argv) === JSON.stringify(reordered);

  if (forcedFlags.length) {
    reordered = reordered
      .slice(0, 1)
      .concat(forcedFlags)
      .concat(reordered.slice(1));
    ready = false;
  }

  if (!ready) {
    reordered.push(FORBID_RESPAWNING_FLAG);
    child = respawn(reordered);
  }
  return { ready, child, argv: reordered };
}
