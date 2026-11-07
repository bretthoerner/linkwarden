import { prisma } from "@linkwarden/prisma";
import { removeFiles } from "@linkwarden/filesystem";
import { meiliClient } from "./meilisearchClient";
import { TRASH_RETENTION_DAYS } from "./constants";

export async function cleanupExpiredTrash(batchSize = 100): Promise<number> {
  const retentionDays =
    Number(process.env.TRASH_RETENTION_DAYS) || TRASH_RETENTION_DAYS;
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  const expiredLinks = await prisma.link.findMany({
    where: {
      deletedAt: {
        not: null,
        lt: cutoff,
      },
    },
    select: {
      id: true,
      collectionId: true,
    },
    take: batchSize,
  });

  if (expiredLinks.length === 0) return 0;

  const expiredIds = expiredLinks.map((l) => l.id);

  await prisma.link.deleteMany({
    where: {
      id: { in: expiredIds },
    },
  });

  for (const link of expiredLinks) {
    removeFiles(link.id, link.collectionId);
  }

  await meiliClient?.index("links").deleteDocuments(expiredIds);

  return expiredLinks.length;
}
