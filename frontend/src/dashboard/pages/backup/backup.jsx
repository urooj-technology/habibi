import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Archive, Download, Loader2, RefreshCcw, ShieldAlert, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import useFetchObjects from "../../../api/useFetchObjects";
import useAdd from "../../../api/useAdd";
import { useAuth } from "../../../context/AuthContext";
import { API_BASE_URL } from "../../../config/env";
import PageHeader from "../../../components/PageHeader";
import { InlineAlert } from "../../../components/AlertMessage";
import { FormBody, FormGrid, FormSection, FormShell } from "../../../components/FormShell";

const BACKUP_API = API_BASE_URL;

const BackupPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(null);
  const [restoring, setRestoring] = useState(null);
  const [actionError, setActionError] = useState("");
  const auth = useAuth();
  const user = auth?.user;
  const token = user?.token;

  // Fetch backup files
  const {
    data: backupData,
    isLoading,
    isError,
    error,
    refetch,
  } = useFetchObjects(
    "[backups]",
    "list-backups/",
    token
  );

  const backupFiles = backupData?.backup_files || [];

  const { handleAdd, loading, success } = useAdd(
    "backup",
    token,
    "/app/backup",
    t("backup.backupCreatedSuccessfully"),
    t("backup.failedToCreateBackup")
  );

  const handelTackBackup = () => {
    handleAdd();
  };

  const {
    handleAdd: handleRestore,
    loading: loadingRestore,
    success: successRestore,
  } = useAdd(
    "restore",
    token,
    "/app/backup",
    t("backup.backupRestoredSuccessfully"),
    t("backup.failedToRestoreBackup")
  );

  const handelRestoreBackup = (backupFileName) => {
    setActionError("");
    setRestoring(backupFileName);
    const formData = new FormData();
    formData.append("backup_file", backupFileName);
    handleRestore(formData);
  };

  const deleteBackup = async (backupFileName) => {
    try {
      setActionError("");
      setDeleting(backupFileName);

      const response = await fetch(`${BACKUP_API}/delete-backup/`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({
          backup_file: backupFileName,
        }),
      });

      const data = await response.json();

      if (response.ok) refetch();
      else setActionError(data?.error || t("common.errorOccurred"));
    } catch (error) {
      setActionError(error?.message || t("common.errorOccurred"));
    } finally {
      setDeleting(null);
    }
  };

  useEffect(() => {
    refetch();
    if (successRestore) {
      auth?.logout();
    }
  }, [success, successRestore, refetch, auth]);

  return (
    <FormShell>
      <PageHeader
        title={t("backup.title")}
        subtitle={t("backup.subtitle", "Create, restore and manage system backups")}
        backButton="/app/dashboard"
        backButtonLabel={t("common.back", "Back")}
        icon={<Archive className="h-5 w-5" />}
        actions={[
          <Button key="refresh" variant="outline" onClick={() => refetch()}>
            <RefreshCcw className="h-4 w-4" />
            {t("common.refresh", "Refresh")}
          </Button>,
          <Button key="backup" onClick={handelTackBackup} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {loading ? t("common.processing", "Processing...") : t("backup.backupDatabase")}
          </Button>,
        ]}
      />

      <FormBody>
        {isError ? (
          <InlineAlert severity="error" title={t("common.error")} message={error?.message || t("common.errorOccurred")} />
        ) : null}
        {actionError ? (
          <InlineAlert severity="error" title={t("common.error")} message={actionError} />
        ) : null}

        <FormGrid>
          <FormSection
            span="full"
            title={t("backup.availableBackups", "Available backups")}
            description={t("backup.availableBackupsSub", "Restore or delete backup snapshots")}
            icon={<ShieldAlert className="h-5 w-5" />}
          >
            {isLoading ? (
              <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("common.loading", "Loading")}...
              </div>
            ) : Array.isArray(backupFiles) && backupFiles.length > 0 ? (
              <div className="space-y-2">
                {backupFiles.map((backupFile, index) => (
                  <div
                    key={`${backupFile}-${index}`}
                    className="flex flex-col gap-3 rounded-lg border border-border bg-muted/20 p-3 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{backupFile}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handelRestoreBackup(backupFile)}
                        disabled={restoring === backupFile || loadingRestore}
                      >
                        {restoring === backupFile && loadingRestore ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                        {t("backup.restore")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteBackup(backupFile)}
                        disabled={deleting === backupFile}
                      >
                        {deleting === backupFile ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                        {t("backup.delete")}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {t("backup.noBackupsFound")}
              </p>
            )}
          </FormSection>
        </FormGrid>
      </FormBody>
    </FormShell>
  );
};

export default BackupPage;
