import { prisma } from "@linkwarden/prisma";
import { Link, UsersAndCollections } from "@linkwarden/prisma/client";
import getPermission from "@/lib/api/getPermission";
import { removeFiles } from "@linkwarden/filesystem";
import { meiliClient } from "@linkwarden/lib/meilisearchClient";

export default async function deleteLink(
  userId: number,
  linkId: number,
  permanent?: boolean
) {
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

  const existingLink = await prisma.link.findUnique({
    where: { id: linkId },
  });

  if (!existingLink) {
    return { response: "Link not found.", status: 404 };
  }

  // Soft delete (move to trash) if not already in trash and not permanent
  if (!existingLink.deletedAt && !permanent) {
    const trashedLink: Link = await prisma.link.update({
      where: {
        id: linkId,
      },
      data: {
        deletedAt: new Date(),
      },
    });

    await meiliClient?.index("links").deleteDocument(trashedLink.id);

    return { response: trashedLink, status: 200 };
  }

  // Hard delete if already in trash or permanent flag is set
  const deletedLink: Link = await prisma.link.delete({
    where: {
      id: linkId,
    },
  });

  removeFiles(linkId, collectionIsAccessible.id);

  await meiliClient?.index("links").deleteDocument(deletedLink.id);

  return { response: deletedLink, status: 200 };
}
