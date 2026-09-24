export default function reorder(flags, argv = process.argv) {
  const args = [argv[1]];
  for (const arg of argv.slice(2)) {
    const [flag] = arg.split("=");
    if (flags.includes(flag)) {
      args.unshift(arg);
    } else {
      args.push(arg);
    }
  }
  args.unshift(argv[0]);
  return args;
}
