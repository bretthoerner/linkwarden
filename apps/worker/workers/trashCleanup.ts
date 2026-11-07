import { cleanupExpiredTrash } from "@linkwarden/lib/cleanupExpiredTrash";
import { delay } from "@linkwarden/lib/utils";

const cleanupIntervalInSeconds = 3600; // Check every hour when idle

export async function startTrashCleanup(interval = cleanupIntervalInSeconds) {
  console.log("\x1b[34m%s\x1b[0m", "Starting trash cleanup worker...");

  while (true) {
    try {
      const deletedCount = await cleanupExpiredTrash(100);

      if (deletedCount > 0) {
        console.log(
          "\x1b[34m%s\x1b[0m",
          `Cleaned up ${deletedCount} expired trashed link${
            deletedCount === 1 ? "" : "s"
          }.`
        );
        // Continue immediately if there may be more expired links
        continue;
      }
    } catch (error) {
      console.error("\x1b[34m%s\x1b[0m", "Error cleaning up trash:", error);
    }

    await delay(interval);
  }
}
