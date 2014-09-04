# flagged-respawn [![Build Status](https://secure.travis-ci.org/tkellen/node-flagged-respawn.png)](http://travis-ci.org/tkellen/node-flagged-respawn)
> A tool for respawning node binaries when special flags are present.

[![NPM](https://nodei.co/npm/flagged-respawn.png)](https://nodei.co/npm/flagged-respawn/)

## What is it?

Say you wrote a command line tool that runs arbitrary javascript (e.g. task runner, test framework, etc). For the sake of discussion, let's pretend it's a testing harness you've named `testify`.

Everything is going splendidly until one day you decide to test some code that relies on a feature behind a v8 flag in node (`--harmony`, for example).  Without much thought, you run `testify --harmony spec tests.js`.

It doesn't work. After digging around for a bit, you realize this produces a [`process.argv`](http://nodejs.org/docs/latest/api/process.html#process_process_argv) of:

`['node', '/usr/local/bin/test', '--harmony', 'spec', 'tests.js']`

Crap. The `--harmony` flag is in the wrong place! It should be applied to the **node** command, not our binary. What we actually wanted was this:

`['node', '--harmony', '/usr/local/bin/test', 'spec', 'tests.js']`

Flagged-respawn solves this problem.

## Sample Usage
```js
#!/usr/bin/env node

const flaggedRespawn = require('flagged-respawn');

// get a list of all possible v8 flags to intercept
const v8flags = require('v8flags').fetch();

// check to see if any defined flags are in the wrong position
// if we didn't want to support all v8 flags, we could just as
// easily do if (!flaggedRespawn.needed(['--harmony'])) instead.
if (!flaggedRespawn.needed(v8flags)) {
  // If we are here, no special flags were seen, or this
  // is the child process that our initial run spawned.
  console.log('Running!');
} else {
  // if we are here, there are special flags applied to the
  // wrong command. the above branch will be executed by the
  // child process this spawns.
  console.log('Respawning...');
  flaggedRespawn.execute(v8flags);
}
```

To see it in action, clone this repository and run `npm install` / `npm run respawn` / `npm run nospawn`.

## Release History

* 2014-09-04 - v0.1.1 - initial release
