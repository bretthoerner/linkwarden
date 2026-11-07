import { useState } from "react";
import { LinkIncludingShortenedCollectionAndTags } from "@linkwarden/types/global";
import usePermissions from "@/hooks/usePermissions";
import DeleteLinkModal from "@/components/ModalContent/DeleteLinkModal";
import {
  useDeleteLink,
  useRestoreLink,
  useUpdateArchive,
} from "@linkwarden/router/links";
import toast from "react-hot-toast";
import LinkModal from "@/components/ModalContent/LinkModal";
import { useRouter } from "next/router";
import clsx from "clsx";
import usePinLink from "@/lib/client/pinLink";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import ConfirmationModal from "@/components/ConfirmationModal";
import { TFunction } from "i18next";

type Props = {
  link: LinkIncludingShortenedCollectionAndTags;
  linkModal: boolean;
  setLinkModal: (value: boolean) => void;
  t: TFunction<"translation", undefined>;
  className?: string;
  ghost?: boolean;
  inline?: boolean;
};

export default function LinkActions({
  link,
  linkModal,
  t,
  setLinkModal,
  className,
  ghost,
  inline,
}: Props) {
  const permissions = usePermissions(link.collection.id as number);

  const router = useRouter();

  const isPublicRoute = router.pathname.startsWith("/public");

  const updateArchiveMutation = useUpdateArchive();

  const pinLink = usePinLink();

  const [editLinkModal, setEditLinkModal] = useState(false);
  const [deleteLinkModal, setDeleteLinkModal] = useState(false);
  const [refreshPreservationsModal, setRefreshPreservationsModal] =
    useState(false);

  const deleteLink = useDeleteLink({ toast, t });
  const restoreLink = useRestoreLink({ toast, t });

  const updateArchive = async () => {
    const load = toast.loading(t("sending_request"));

    try {
      await updateArchiveMutation.mutateAsync(link.id as number);
      toast.success(t("link_being_archived"));
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      toast.dismiss(load);
    }
  };

  const isAlreadyPinned = Boolean(link?.pinnedBy && link.pinnedBy[0]);

  return (
    <>
      {isPublicRoute ? (
        <Button
          variant={ghost ? "ghost" : "simple"}
          size="icon"
          className={clsx(className, "cursor-pointer")}
          onClick={() => setLinkModal(true)}
        >
          <i title={t("show_link_details")} className="bi-info-circle text-xl" />
        </Button>
      ) : inline ? (
        <div className={clsx("flex items-center gap-1", className)}>
          {!link.deletedAt && (
            <Button
              variant="simple"
              size="icon"
              className="cursor-pointer text-neutral"
              onClick={(e) => {
                e.stopPropagation();
                pinLink(link);
              }}
            >
              <i
                title={isAlreadyPinned ? t("unpin") : t("pin_to_dashboard")}
                className={clsx(
                  "text-xl",
                  isAlreadyPinned ? "bi-pin-fill" : "bi-pin"
                )}
              />
            </Button>
          )}

          <Button
            variant="simple"
            size="icon"
            className="cursor-pointer text-neutral"
            onClick={(e) => {
              e.stopPropagation();
              setLinkModal(true);
            }}
          >
            <i
              title={t("show_link_details")}
              className="bi-info-circle text-xl"
            />
          </Button>

          {!link.deletedAt &&
            (permissions === true || permissions?.canUpdate) && (
              <Button
                variant="simple"
                size="icon"
                className="cursor-pointer text-neutral"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditLinkModal(true);
                }}
              >
                <i
                  title={t("edit_link")}
                  className="bi-pencil-square text-xl"
                />
              </Button>
            )}

          {link.deletedAt &&
            (permissions === true || permissions?.canDelete) && (
              <Button
                variant="simple"
                size="icon"
                className="cursor-pointer text-neutral hover:text-primary"
                onClick={async (e) => {
                  e.stopPropagation();
                  await restoreLink.mutateAsync(link.id as number);
                  toast.success(t("link_restored"));
                }}
              >
                <i
                  title={t("restore")}
                  className="bi-arrow-counterclockwise text-xl"
                />
              </Button>
            )}

          {(permissions === true || permissions?.canDelete) && (
            <Button
              variant="simple"
              size="icon"
              className="cursor-pointer text-neutral hover:text-error"
              onClick={async (e) => {
                e.stopPropagation();
                await deleteLink.mutateAsync(link.id as number);
                toast.success(
                  link.deletedAt ? t("deleted") : t("moved_to_trash")
                );
              }}
            >
              <i
                title={link.deletedAt ? t("delete_permanently") : t("delete")}
                className={clsx(
                  "bi-trash text-xl",
                  link.deletedAt && "text-error"
                )}
              />
            </Button>
          )}
        </div>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              asChild
              variant={ghost ? "ghost" : "simple"}
              size="icon"
              className={clsx(className, "cursor-pointer")}
              onMouseDown={(e) => e.preventDefault()}
            >
              <i title="More" className="bi-three-dots text-xl" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent sideOffset={4} align="end">
            {!link.deletedAt && (
              <DropdownMenuItem onSelect={() => pinLink(link)}>
                <i className="bi-pin" />

                {link.pinnedBy && link.pinnedBy.length > 0
                  ? t("unpin")
                  : t("pin_to_dashboard")}
              </DropdownMenuItem>
            )}

            {link.deletedAt &&
              (permissions === true || permissions?.canDelete) && (
                <DropdownMenuItem
                  onSelect={async () => {
                    await restoreLink.mutateAsync(link.id as number);
                    toast.success(t("link_restored"));
                  }}
                >
                  <i className="bi-arrow-counterclockwise" />
                  {t("restore")}
                </DropdownMenuItem>
              )}

            <DropdownMenuItem onSelect={() => setLinkModal(true)}>
              <i className="bi-info-circle" />

              {t("show_link_details")}
            </DropdownMenuItem>

            {!link.deletedAt &&
              (permissions === true || permissions?.canUpdate) && (
                <DropdownMenuItem onSelect={() => setEditLinkModal(true)}>
                  <i className="bi-pencil-square" />

                  {t("edit_link")}
                </DropdownMenuItem>
              )}

            {(permissions === true || permissions?.canDelete) && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-error"
                  onClick={async (e) => {
                    if (link.deletedAt || e.shiftKey) {
                      await deleteLink.mutateAsync(link.id as number);
                      toast.success(
                        link.deletedAt ? t("deleted") : t("moved_to_trash")
                      );
                    } else {
                      await deleteLink.mutateAsync(link.id as number);
                      toast.success(t("moved_to_trash"));
                    }
                  }}
                >
                  <i className="bi-trash" />

                  {link.deletedAt ? t("delete_permanently") : t("delete")}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {editLinkModal && (
        <LinkModal
          onClose={() => setEditLinkModal(false)}
          onPin={() => pinLink(link)}
          onUpdateArchive={() => setRefreshPreservationsModal(true)}
          onDelete={() => setDeleteLinkModal(true)}
          link={link}
          activeMode="edit"
        />
      )}
      {deleteLinkModal && (
        <DeleteLinkModal
          onClose={() => setDeleteLinkModal(false)}
          activeLink={link}
        />
      )}
      {refreshPreservationsModal && (
        <ConfirmationModal
          toggleModal={() => {
            setRefreshPreservationsModal(false);
          }}
          onConfirmed={async () => {
            await updateArchive();
          }}
          title={t("refresh_preserved_formats")}
        >
          <p className="mb-5">
            {t("refresh_preserved_formats_confirmation_desc")}
          </p>
        </ConfirmationModal>
      )}
      {linkModal && (
        <LinkModal
          onClose={() => setLinkModal(false)}
          onPin={() => pinLink(link)}
          onUpdateArchive={() => setRefreshPreservationsModal(true)}
          onDelete={() => setDeleteLinkModal(true)}
          link={link}
        />
      )}
    </>
  );
}
