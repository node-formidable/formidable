import { strictEqual } from "node:assert";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import PersistentFile from "../../src/PersistentFile.js";

test("does not write after the file stream is destroyed", async () => {
  const directory = await mkdtemp(join(tmpdir(), "formidable-destroyed-"));

  try {
    const file = new PersistentFile({
      filepath: join(directory, "upload"),
      newFilename: "upload",
      originalFilename: "upload",
      mimetype: "application/octet-stream",
    });

    file.open();
    await once(file._writeStream, "open");
    file.destroy();

    strictEqual(file._writeStream.destroyed, true);
    strictEqual(file._writeStream.closed, false);

    await new Promise((resolve) => file.write(Buffer.from("ignored"), resolve));

    strictEqual(file.size, 0);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
