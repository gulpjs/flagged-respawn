export default function remover(flags, argv) {
  const args = argv.slice(0, 1);
  for (const arg of argv.slice(1)) {
    const [flag] = arg.split("=");
    if (!flags.includes(flag)) {
      args.push(arg);
    }
  }
  return args;
}
