import assert from "node:assert";
import { describe, it } from "node:test";
import { exec } from "node:child_process";
import os from "node:os";
import path from "node:path";

import reorder from "../lib/reorder.js";
import remover from "../lib/remover.js";
import flaggedRespawn from "../index.js";

describe("flaggedRespawn", function () {
  const flags = ["--harmony", "--use-strict", "--stack-size"];

  describe("reorder", function () {
    it("should re-order args, placing special flags first", function () {
      const needsRespawn = [
        "node",
        "file.js",
        "--flag",
        "--harmony",
        "command",
      ];
      const noRespawnNeeded = ["node", "bin/flagged-respawn", "thing"];
      assert.deepStrictEqual(reorder(flags, needsRespawn), [
        "node",
        "--harmony",
        "file.js",
        "--flag",
        "command",
      ]);
      assert.deepStrictEqual(reorder(flags, noRespawnNeeded), noRespawnNeeded);
    });

    it("should keep flags values when not placed first", function () {
      const args = ["node", "file.js", "--stack-size=2048"];
      const expected = ["node", "--stack-size=2048", "file.js"];
      assert.deepStrictEqual(reorder(flags, args), expected);
    });

    it("should ignore special flags when they are in the correct position", function () {
      const args = ["node", "--harmony", "file.js", "--flag"];
      assert.deepStrictEqual(reorder(flags, reorder(flags, args)), args);
    });

    it("defaults to process.argv if none specified", function () {
      assert.deepStrictEqual(reorder(flags), process.argv);
    });
  });

  describe("remover", function () {
    it("should remove args included in flags", function () {
      const needsRespawn = [
        "node",
        "file.js",
        "--flag",
        "--harmony",
        "command",
      ];
      const noRespawnNeeded = ["node", "bin/flagged-respawn", "thing"];
      assert.deepStrictEqual(remover(flags, needsRespawn), [
        "node",
        "file.js",
        "--flag",
        "command",
      ]);
      assert.deepStrictEqual(reorder(flags, noRespawnNeeded), noRespawnNeeded);
    });

    it("should remove a arg even when the arg has value", function () {
      const args = ["node", "file.js", "--stack-size=2048"];
      const expected = ["node", "file.js"];
      assert.deepStrictEqual(remover(flags, args), expected);
    });

    it("should remove special flags when they are in the correct position", function () {
      const args = ["node", "--harmony", "file.js", "--flag"];
      const expected = ["node", "file.js", "--flag"];
      assert.deepStrictEqual(reorder(flags, remover(flags, args)), expected);
    });
  });

  describe("main export", function () {
    it("should throw if no flags are specified", function () {
      assert.throws(function () {
        flaggedRespawn();
      });
    });

    it("should throw if no argv is specified", function () {
      assert.throws(function () {
        flaggedRespawn(flags);
      });
    });

    it("should respawn and pipe stderr/stdout to parent", function (t, done) {
      exec("node ./test/bin/respawner.js --harmony", function (err, stdout) {
        assert.strictEqual(err, null);
        assert.strictEqual(
          stdout.replace(/[0-9]/g, ""),
          "Special flags found, respawning.\nRespawned to PID: \nRunning!\n",
        );
        done();
      });
    });

    it("should respawn and pass exit code from child to parent", function (t, done) {
      exec("node ./test/bin/exit_code.js --harmony", function (err) {
        assert.strictEqual(err.code, 100);
        done();
      });
    });

    it("should respawn; if child is killed, parent should exit with same signal", function (t, done) {
      exec("node ./test/bin/signal.js --harmony", function (err) {
        switch (os.platform()) {
          // err.signal is null on Windows and Linux.
          // Is this related to the issue #12378 of nodejs/node?
          case "win32":
          case "linux": {
            assert.strictEqual(err.signal, null);
            break;
          }
          default: {
            assert.strictEqual(err.signal, "SIGHUP");
            break;
          }
        }
        done();
      });
    });

    it("should return with ready as true when respawn is not needed", function () {
      const argv = ["node", "./test/bin/respawner"];
      const { ready } = flaggedRespawn(flags, argv);
      assert.strictEqual(ready, true);
    });

    it("should return with ready as false when respawn is needed", function (t, done) {
      const argv = ["node", "./test/bin/respawn-needed", "--harmony"];
      exec(argv.join(" "), function (err, stdout, stderr) {
        assert.strictEqual(err, null);
        assert.strictEqual(stderr, "");
        const results = stdout.slice(0, -1).split("\n");
        assert.strictEqual(results.length, 2);
        assert.strictEqual(JSON.parse(results[0]).ready, false);
        assert.strictEqual(JSON.parse(results[1]).ready, true);
        done();
      });
    });

    it("should return with the child process when ready", function (t, done) {
      const argv = ["node", "./test/bin/respawn-needed", "--harmony"];
      exec(argv.join(" "), function (err, stdout, stderr) {
        assert.strictEqual(err, null);
        assert.strictEqual(stderr, "");
        const results = stdout.slice(0, -1).split("\n");
        assert.strictEqual(results.length, 2);

        let params = JSON.parse(results[0]);
        assert.notStrictEqual(params.child_pid, params.process_pid);

        params = JSON.parse(results[1]);
        assert.strictEqual(params.child_pid, params.process_pid);
        done();
      });
    });

    it("should returns with own process when respawn not needed", function () {
      const argv = ["node", "./test/bin/respawner"];
      const { child } = flaggedRespawn(flags, argv);
      assert.strictEqual(child.pid, process.pid);
    });
  });

  describe("force and forbid respawning", function () {
    it("forbid respawning with --no-respawning flag", function (t, done) {
      const cmd = [
        "node",
        path.resolve(import.meta.dirname, "bin/respawner.js"),
        "--harmony",
        "--no-respawning",
      ].join(" ");

      exec(cmd, function cb(err, stdout, stderr) {
        assert.strictEqual(err, null);
        assert.strictEqual(stderr, "");
        assert.strictEqual(stdout, "Running!\n");
        done();
      });
    });

    it("always forbid respawning with inner --no-respawning", function (t, done) {
      const cmd = [
        "node",
        path.resolve(import.meta.dirname, "bin/forbid-respawning.js"),
        "--harmony",
      ].join(" ");

      exec(cmd, function cb(err, stdout, stderr) {
        assert.strictEqual(err, null);
        assert.strictEqual(stderr, "");
        assert.strictEqual(stdout, "Running!\n");
        done();
      });
    });

    it("should force respawning with node flags (array)", function (t, done) {
      const cmd = [
        "node",
        path.resolve(import.meta.dirname, "bin/force-respawning.js"),
      ].join(" ");

      exec(cmd, function cb(err, stdout, stderr) {
        assert.strictEqual(err, null);
        assert.strictEqual(stderr, "");
        assert.strictEqual(stdout, "Respawning!\nRunning!\n");
        done();
      });
    });

    it("should force respawning with node flags (string)", function (t, done) {
      const cmd = [
        "node",
        path.resolve(import.meta.dirname, "bin/force-respawning-string.js"),
      ].join(" ");

      exec(cmd, function cb(err, stdout, stderr) {
        assert.strictEqual(err, null);
        assert.strictEqual(stderr, "");
        assert.strictEqual(stdout, "Respawning!\nRunning!\n");
        done();
      });
    });

    it("should take priority to forbidding than forcing", function (t, done) {
      exec("node ./test/bin/force-and-forbid-respawning.js", cb);

      function cb(err, stdout, stderr) {
        assert.strictEqual(err, null);
        assert.strictEqual(stderr, "");
        assert.strictEqual(stdout, "Running!\n");
        done();
      }
    });
  });

  describe("cli args which are passed to app", function () {
    it("should pass args except v8flags, forced node flags, --no-respawning when respawned", function (t, done) {
      const script = path.resolve(import.meta.dirname, "bin/print-args.js");
      const cmd = [
        '"' + process.argv[0] + '"',
        script,
        "aaa",
        "--harmony",
        "-q",
        "1234",
        "--cwd",
        "bbb/ccc/ddd",
        "--prof-browser-mode",
        "-V",
      ].join(" ");

      const message =
        "Respawning!\n" +
        "cli args passed to app: " +
        [
          process.argv[0],
          script,
          "aaa",
          "-q",
          "1234",
          "--cwd",
          "bbb/ccc/ddd",
          "-V",
        ].join(" ") +
        "\n";

      exec(cmd, function cb(err, stdout, stderr) {
        assert.strictEqual(err, null);
        assert.strictEqual(stderr, "");
        assert.strictEqual(stdout, message);
        done();
      });
    });

    it("should pass args except v8flags, forced node flags, --no-respawning when not respawned", function (t, done) {
      const script = path.resolve(import.meta.dirname, "bin/print-args.js");
      const cmd = [
        '"' + process.argv[0] + '"',
        script,
        "aaa",
        "--harmony",
        "-q",
        "1234",
        "--cwd",
        "bbb/ccc/ddd",
        "--prof-browser-mode",
        "-V",
        "--no-respawning",
      ].join(" ");

      const message =
        "cli args passed to app: " +
        [
          process.argv[0],
          script,
          "aaa",
          "-q",
          "1234",
          "--cwd",
          "bbb/ccc/ddd",
          "-V",
        ].join(" ") +
        "\n";

      exec(cmd, function cb(err, stdout, stderr) {
        assert.strictEqual(err, null);
        assert.strictEqual(stderr, "");
        assert.strictEqual(stdout, message);
        done();
      });
    });
  });

  describe("parameter checks", function () {
    it("should throw an error when flags is nullish", function () {
      const argv = ["node", "./test/bin/respawner"];

      assert.throws(function () {
        flaggedRespawn(null, argv);
      });

      assert.throws(function () {
        flaggedRespawn(flags, undefined);
      });
    });

    it("will not respawn if forced flags is not string or array", function () {
      const argv = ["node", "./test/bin/respawner"];

      const { ready, child } = flaggedRespawn(flags, argv, {});
      assert.strictEqual(ready, true);
      assert.strictEqual(child.pid, process.pid);
    });
  });
});
