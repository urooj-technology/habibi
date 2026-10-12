import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "../../../context/AuthContext";
import usePermissions from "../../../hooks/usePermissions";
import { Can } from "../../../components/RequirePermission";
import useFetchObjects from "../../../api/useFetchObjects";
import useDelete from "../../../api/useDelete";
import PageHeader from "../../../components/PageHeader";
import ReusableTable from "../../../components/ReusableTable";

const RoleIndex = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const auth = useAuth();
  const token = auth?.user?.token;
  const { can } = usePermissions();

  const { data, isLoading } = useFetchObjects(["roles"], "roles/", token);

  const roles = useMemo(() => {
    if (Array.isArray(data)) return data;
    return data?.results || [];
  }, [data]);

  const { handleDelete, ConfirmDialog } = useDelete("roles", token);

  const columns = useMemo(
    () => [
      {
        id: "name",
        label: t("roles.name", "Role"),
        sortable: true,
        minWidth: 140,
      },
      {
        id: "slug",
        label: t("roles.slug", "Slug"),
        minWidth: 100,
      },
      {
        id: "user_count",
        label: t("roles.users", "Users"),
        minWidth: 80,
        format: (v) => v ?? 0,
      },
      {
        id: "permission_codes",
        label: t("roles.permissions", "Permissions"),
        minWidth: 120,
        format: (codes) =>
          Array.isArray(codes)
            ? t("roles.permissionCount", "{{count}} permissions", {
                count: codes.length,
              })
            : "—",
      },
      {
        id: "is_system",
        label: t("roles.type", "Type"),
        minWidth: 100,
        format: (v) =>
          v ? t("roles.system", "System") : t("roles.custom", "Custom"),
      },
      {
        // Not named "actions" — ReusableTable would replace custom format otherwise
        id: "role_actions",
        label: t("common.actions", "Actions"),
        minWidth: 120,
        format: (_, row) => (
          <div className="flex items-center justify-center gap-1">
            <Can perm="roles.edit">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title={t("common.edit", "Edit")}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/app/user/roles/${row.id}/edit`);
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </Can>
            <Can perm="roles.delete">
              {!row.is_system ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:bg-destructive/10"
                  title={t("common.delete", "Delete")}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(row.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              ) : null}
            </Can>
          </div>
        ),
      },
    ],
    [t, navigate, handleDelete]
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("roles.title", "Roles")}
        subtitle={t(
          "roles.subtitle",
          "Define what each role can view and change"
        )}
        icon={<Shield className="h-5 w-5" />}
        actions={
          can("roles.create")
            ? [
                <Button
                  key="add"
                  onClick={() => navigate("/app/user/roles/add")}
                  className="gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  {t("roles.add", "Add role")}
                </Button>,
              ]
            : []
        }
      />

      <ReusableTable
        columns={columns}
        data={roles}
        loading={isLoading}
        emptyMessage={t("roles.empty", "No roles found")}
        rowActions={false}
      />

      <ConfirmDialog />
    </div>
  );
};

export default RoleIndex;
