import { prisma } from "@linkwarden/prisma";
import { UsersAndCollections } from "@linkwarden/prisma/client";
import getPermission from "@/lib/api/getPermission";

export default async function restoreLinkById(userId: number, linkId: number) {
  if (!linkId) return { response: "Please choose a valid link.", status: 401 };

  const collectionIsAccessible = await getPermission({ userId, linkId });

  const memberHasAccess = collectionIsAccessible?.members.some(
    (e: UsersAndCollections) => e.userId === userId && e.canDelete
  );

  if (
    !collectionIsAccessible ||
    !(collectionIsAccessible?.ownerId === userId || memberHasAccess)
  )
    return { response: "Collection is not accessible.", status: 401 };

  const restoredLink = await prisma.link.update({
    where: {
      id: linkId,
    },
    data: {
      deletedAt: null,
      indexVersion: null,
    },
    include: {
      tags: true,
      collection: true,
      pinnedBy: {
        where: { id: userId },
        select: { id: true },
      },
    },
  });

  return { response: restoredLink, status: 200 };
}
