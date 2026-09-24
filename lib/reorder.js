import isV8flags from "./is-v8flags.js";

export default function reorder(flags, argv) {
  if (!argv) {
    argv = process.argv;
  }
  var args = [argv[1]];
  argv.slice(2).forEach(function (arg) {
    var flag = arg.split("=")[0];
    if (isV8flags(flag, flags)) {
      args.unshift(arg);
    } else {
      args.push(arg);
    }
  });
  args.unshift(argv[0]);
  return args;
}
