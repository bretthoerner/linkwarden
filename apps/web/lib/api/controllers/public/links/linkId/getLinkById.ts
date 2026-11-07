import { prisma } from "@linkwarden/prisma";

export default async function getLinkById(linkId: number) {
  if (!linkId)
    return {
      response: "Please choose a valid link.",
      status: 401,
    };

  const link = await prisma.link.findFirst({
    where: {
      id: linkId,
      deletedAt: null,
      collection: {
        isPublic: true,
      },
    },
    include: {
      tags: true,
      collection: true,
    },
  });

  return { response: link, status: 200 };
}
