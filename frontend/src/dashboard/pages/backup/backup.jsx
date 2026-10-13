import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Archive, Download, Loader2, RefreshCcw, Shield } from "lucide-react";
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
  const [downloading, setDownloading] = useState(null);
  const [actionError, setActionError] = useState("");
  const auth = useAuth();
  const token = auth?.user?.token;

  const {
    data: backupData,
    isLoading,
    isError,
    error,
    refetch,
  } = useFetchObjects("[backups]", "list-backups/", token);

  const backupFiles = backupData?.backup_files || [];

  const { handleAdd, loading, success } = useAdd(
    "backup",
    token,
    null,
    t("backup.backupCreatedSuccessfully"),
    t("backup.failedToCreateBackup")
  );

  const downloadBackup = async (backupFileName) => {
    try {
      setActionError("");
      setDownloading(backupFileName);
      const response = await fetch(
        `${BACKUP_API}/download-backup/?backup_file=${encodeURIComponent(backupFileName)}`,
        { headers: { Authorization: `Token ${token}` } }
      );
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || t("common.errorOccurred"));
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = backupFileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setActionError(e?.message || t("common.errorOccurred"));
    } finally {
      setDownloading(null);
    }
  };

  useEffect(() => {
    if (success) refetch();
  }, [success, refetch]);

  return (
    <FormShell>
      <PageHeader
        title={t("backup.title")}
        subtitle={t(
          "backup.subtitle",
          "Create and download system backups"
        )}
        backButton="/app/dashboard"
        backButtonLabel={t("common.back", "Back")}
        icon={<Archive className="h-5 w-5" />}
        actions={[
          <Button key="refresh" variant="outline" onClick={() => refetch()}>
            <RefreshCcw className="h-4 w-4" />
            {t("common.refresh", "Refresh")}
          </Button>,
          <Button key="backup" onClick={() => handleAdd()} disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {loading
              ? t("common.processing", "Processing...")
              : t("backup.backupDatabase")}
          </Button>,
        ]}
      />

      <FormBody>
        {isError ? (
          <InlineAlert
            severity="error"
            title={t("common.error")}
            message={error?.message || t("common.errorOccurred")}
          />
        ) : null}
        {actionError ? (
          <InlineAlert
            severity="error"
            title={t("common.error")}
            message={actionError}
          />
        ) : null}

        <FormGrid>
          <FormSection
            span="full"
            title={t("backup.availableBackups", "Available backups")}
            description={t(
              "backup.availableBackupsSub",
              "Download backup snapshots to keep offline"
            )}
            icon={<Shield className="h-5 w-5" />}
          >
            {isLoading ? (
              <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
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
                      <p className="truncate text-sm font-semibold text-foreground">
                        {backupFile}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => downloadBackup(backupFile)}
                      disabled={downloading === backupFile}
                    >
                      {downloading === backupFile ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      {t("common.download", "Download")}
                    </Button>
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
