import type { OutboxEntry, OutboxStorage } from "@baydar/shared";
import { File, Paths } from "expo-file-system";

/**
 * The React Native half of the outbox: where the queue lives.
 *
 * One JSON file in the document directory — the directory the system does not
 * reclaim under storage pressure, which a queue of unsent posts must not be.
 *
 * ponytail: `expo-file-system` is already a dependency and this is a list of
 * tens of small objects that is rewritten whole on every change. SQLite would
 * add a dependency, a schema and a migration path to store one array. Add it
 * when the queue needs to be queried rather than read.
 *
 * The write is not atomic — a kill between truncate and write loses the queue.
 * Accepted: the alternative is write-temp-then-rename, and `File` has no
 * rename, so it would mean two files and a recovery path for a window of
 * microseconds against a loss the member can already see and re-send from.
 */

const FILE_NAME = "outbox.v1.json";

const queueFile = (): File => new File(Paths.document, FILE_NAME);

export function createNativeOutboxStorage(): OutboxStorage {
  return {
    async read(): Promise<OutboxEntry[]> {
      try {
        const file = queueFile();
        if (!file.exists) return [];
        const parsed: unknown = JSON.parse(await file.text());
        return Array.isArray(parsed) ? (parsed as OutboxEntry[]) : [];
      } catch {
        // A truncated or hand-edited file reads as an empty queue rather than
        // throwing out of every composer. See the header on atomicity.
        return [];
      }
    },

    write(entries: OutboxEntry[]): Promise<void> {
      try {
        const file = queueFile();
        if (!file.exists) file.create({ intermediates: true, overwrite: true });
        file.write(JSON.stringify(entries));
      } catch {
        // A queue that cannot persist still sends; refusing to post because
        // the disk is full would be the worse failure.
      }
      return Promise.resolve();
    },
  };
}
