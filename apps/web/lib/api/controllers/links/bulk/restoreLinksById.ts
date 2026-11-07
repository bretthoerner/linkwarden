import { prisma } from "@linkwarden/prisma";
import { UsersAndCollections } from "@linkwarden/prisma/client";
import getPermission from "@/lib/api/getPermission";

export default async function restoreLinksById(
  userId: number,
  linkIds: number[]
) {
  if (!linkIds || linkIds.length === 0) {
    return { response: "Please choose valid links.", status: 401 };
  }

  for (const linkId of linkIds) {
    const collectionIsAccessible = await getPermission({ userId, linkId });

    const memberHasAccess = collectionIsAccessible?.members.some(
      (e: UsersAndCollections) => e.userId === userId && e.canDelete
    );

    if (!(collectionIsAccessible?.ownerId === userId || memberHasAccess)) {
      return { response: "Collection is not accessible.", status: 401 };
    }
  }

  const restoredLinks = await prisma.link.updateMany({
    where: {
      id: { in: linkIds },
    },
    data: {
      deletedAt: null,
      indexVersion: null,
    },
  });

  return { response: restoredLinks, status: 200 };
}
