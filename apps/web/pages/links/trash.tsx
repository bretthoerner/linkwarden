import MainLayout from "@/layouts/MainLayout";
import React, { ReactElement, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { Sort, ViewMode } from "@linkwarden/types/global";
import { useTranslation } from "next-i18next";
import getServerSideProps from "@/lib/client/getServerSideProps";
import LinkListOptions from "@/components/LinkListOptions";
import { useEmptyTrash, useLinks } from "@linkwarden/router/links";
import Links from "@/components/LinkViews/Links";
import { NextPageWithLayout } from "../_app";
import { Button } from "@/components/ui/button";
import ConfirmationModal from "@/components/ConfirmationModal";
import toast from "react-hot-toast";

const Page: NextPageWithLayout = () => {
  const { t } = useTranslation();

  const [viewMode, setViewMode] = useState<ViewMode>(
    (localStorage.getItem("viewMode") as ViewMode) || ViewMode.List
  );
  const [sortBy, setSortBy] = useState<Sort>(
    Number(localStorage.getItem("sortBy")) ?? Sort.DateNewestFirst
  );

  const { links, data } = useLinks({
    sort: sortBy,
    trashedOnly: true,
  });

  const emptyTrash = useEmptyTrash();

  const [editMode, setEditMode] = useState(false);
  const [emptyTrashModal, setEmptyTrashModal] = useState(false);

  const handleEmptyTrash = async () => {
    const load = toast.loading(t("deleting"));
    try {
      await emptyTrash.mutateAsync();
      toast.success(t("trash_emptied"));
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      toast.dismiss(load);
    }
  };

  return (
    <div className="p-3 flex flex-col gap-5 w-full h-full">
      <LinkListOptions
        t={t}
        viewMode={viewMode}
        setViewMode={setViewMode}
        sortBy={sortBy}
        setSortBy={setSortBy}
        editMode={editMode}
        setEditMode={setEditMode}
        links={links}
        isTrash
      >
        <div className="flex items-center gap-4">
          <PageHeader
            icon={"bi-trash"}
            title={t("trash")}
            description={t("trash_desc")}
          />
          {links && links.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setEmptyTrashModal(true)}
            >
              <i className="bi-trash mr-1" />
              {t("empty_trash")}
            </Button>
          )}
        </div>
      </LinkListOptions>

      {!data.isLoading && links && !links[0] && (
        <div
          style={{ flex: "1 1 auto" }}
          className="flex flex-col gap-2 justify-center h-full w-full mx-auto p-10"
        >
          <i className="bi-trash text-7xl mx-auto mb-3 text-primary drop-shadow text-center" />
          <p className="text-center text-xl">{t("trash_is_empty")}</p>
          <p className="text-center mx-auto max-w-96 w-fit text-neutral text-sm">
            {t("trash_is_empty_desc")}
          </p>
        </div>
      )}
      <Links
        editMode={editMode}
        links={links}
        layout={viewMode}
        useData={data}
      />
      {emptyTrashModal && (
        <ConfirmationModal
          toggleModal={() => setEmptyTrashModal(false)}
          onConfirmed={handleEmptyTrash}
          title={t("empty_trash")}
        >
          <p className="mb-5">{t("empty_trash_confirmation_desc")}</p>
        </ConfirmationModal>
      )}
    </div>
  );
};

Page.getLayout = function getLayout(page: ReactElement<any>) {
  return <MainLayout>{page}</MainLayout>;
};

export default Page;

export { getServerSideProps };
