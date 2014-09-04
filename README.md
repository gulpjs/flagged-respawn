# flagged-respawn [![Build Status](https://secure.travis-ci.org/tkellen/node-flagged-respawn.png)](http://travis-ci.org/tkellen/node-flagged-respawn)
> A tool for respawning node binaries when special flags are present.

[![NPM](https://nodei.co/npm/flagged-respawn.png)](https://nodei.co/npm/flagged-respawn/)

## What is it?

Say you wrote a command line tool that runs arbitrary javascript (e.g. task runner, test framework, etc). Now, say you want to support running it with v8 flags enabled (`--harmony`, for example).

For example, let's run an imaginary testing tool with the following command: `test --harmony spec tests.js`. This would produce a [`process.argv`](http://nodejs.org/docs/latest/api/process.html#process_process_argv) of:

`['node', '/usr/local/bin/test', '--harmony', 'spec', 'tests.js']`

The `--harmony` flag is in the wrong place! It needs to be a part of the **node** command. What we actually wanted was:

`['node', '--harmony', '/usr/local/bin/test', 'spec', 'tests.js']`

Good news, flaggedRespawn does exactly this. All it takes it a simple conditional in your cli code:

## Example
```js
#!/usr/bin/env node

const flaggedRespawn = require('flagged-respawn');

// get a list of all possible v8 flags to intercept
const v8flags = require('v8flags').fetch();

// if necessary, respawn to apply node flags
if (!flaggedRespawn.needed(v8flags)) {
  // If we are here, no respawn was needed a.k.a no special flags
  // were seen, or this is the child process that was spawned by
  // the first run.
  console.log('Running!');
} else {
  // respawn so the above branch is entered
  console.log('Respawning...');
  flaggedRespawn.execute(v8flags);
}
```

To see it in action, clone this repository and run `npm install` / `npm run respawn` / `npm run nospawn`.

## Release History

* 2014-09-04 - v0.1.0 - initial release
