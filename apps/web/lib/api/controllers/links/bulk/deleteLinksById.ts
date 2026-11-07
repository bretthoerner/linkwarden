import { prisma } from "@linkwarden/prisma";
import { UsersAndCollections } from "@linkwarden/prisma/client";
import getPermission from "@/lib/api/getPermission";
import { removeFiles } from "@linkwarden/filesystem";
import { meiliClient } from "@linkwarden/lib/meilisearchClient";

export default async function deleteLinksById(
  userId: number,
  linkIds?: number[],
  options?: { permanent?: boolean; emptyTrash?: boolean }
) {
  if (options?.emptyTrash) {
    const trashedLinks = await prisma.link.findMany({
      where: {
        deletedAt: { not: null },
        collection: {
          OR: [
            { ownerId: userId },
            {
              members: {
                some: {
                  userId,
                  canDelete: true,
                },
              },
            },
          ],
        },
      },
      select: {
        id: true,
        collectionId: true,
      },
    });

    if (trashedLinks.length === 0) {
      return { response: { count: 0 }, status: 200 };
    }

    const idsToDelete = trashedLinks.map((l) => l.id);

    const deletedLinks = await prisma.link.deleteMany({
      where: {
        id: { in: idsToDelete },
      },
    });

    for (const link of trashedLinks) {
      removeFiles(link.id, link.collectionId);
    }

    await meiliClient?.index("links").deleteDocuments(idsToDelete);

    return { response: deletedLinks, status: 200 };
  }

  if (!linkIds || linkIds.length === 0) {
    return { response: "Please choose valid links.", status: 401 };
  }

  const collectionIsAccessibleArray = [];

  for (const linkId of linkIds) {
    const collectionIsAccessible = await getPermission({ userId, linkId });

    const memberHasAccess = collectionIsAccessible?.members.some(
      (e: UsersAndCollections) => e.userId === userId && e.canDelete
    );

    if (!(collectionIsAccessible?.ownerId === userId || memberHasAccess)) {
      return { response: "Collection is not accessible.", status: 401 };
    }

    collectionIsAccessibleArray.push(collectionIsAccessible);
  }

  const existingLinks = await prisma.link.findMany({
    where: {
      id: { in: linkIds },
    },
    select: {
      id: true,
      collectionId: true,
      deletedAt: true,
    },
  });

  const toSoftDelete = existingLinks.filter(
    (l) => !l.deletedAt && !options?.permanent
  );
  const toHardDelete = existingLinks.filter(
    (l) => Boolean(l.deletedAt) || Boolean(options?.permanent)
  );

  let softDeletedCount = 0;
  let hardDeletedCount = 0;

  if (toSoftDelete.length > 0) {
    const res = await prisma.link.updateMany({
      where: {
        id: { in: toSoftDelete.map((l) => l.id) },
      },
      data: {
        deletedAt: new Date(),
      },
    });
    softDeletedCount = res.count;
  }

  if (toHardDelete.length > 0) {
    const hardDeleteIds = toHardDelete.map((l) => l.id);
    const res = await prisma.link.deleteMany({
      where: {
        id: { in: hardDeleteIds },
      },
    });
    hardDeletedCount = res.count;

    for (const link of toHardDelete) {
      removeFiles(link.id, link.collectionId);
    }
  }

  await meiliClient?.index("links").deleteDocuments(linkIds);

  return {
    response: { count: softDeletedCount + hardDeletedCount },
    status: 200,
  };
}
