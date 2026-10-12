import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { toast } from "react-toastify";
import {
  CheckSquare,
  Loader2,
  Save,
  Shield,
  Square,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { API_BASE_URL } from "../../../config/env";
import { useAuth } from "../../../context/AuthContext";
import useFetchObjects from "../../../api/useFetchObjects";
import PageHeader from "../../../components/PageHeader";
import { FormTextField } from "../../../components/FormFields";
import {
  FormShell,
  FormBody,
  FormGrid,
  FormSection,
  FormRow,
} from "../../../components/FormShell";
import { FullPageLoader } from "../../../components/LoadingScreen";

const ACTIONS = ["view", "create", "edit", "delete", "manage"];

function slugify(name) {
  return (name || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const RoleForm = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const auth = useAuth();
  const token = auth?.user?.token;

  const { data: catalog, isLoading: catalogLoading } = useFetchObjects(
    ["permissions-catalog"],
    "permissions/",
    token
  );

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState(() => new Set());
  const [slugTouched, setSlugTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingRole, setLoadingRole] = useState(isEdit);
  const [isSystem, setIsSystem] = useState(false);

  const permissions = useMemo(() => {
    if (Array.isArray(catalog)) return catalog;
    return catalog?.results || [];
  }, [catalog]);

  const modules = useMemo(() => {
    const map = {};
    permissions.forEach((p) => {
      if (!map[p.module]) map[p.module] = [];
      map[p.module].push(p);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [permissions]);

  const totalPerms = permissions.length;
  const selectedCount = selected.size;
  const progress =
    totalPerms > 0 ? Math.round((selectedCount / totalPerms) * 100) : 0;

  useEffect(() => {
    if (!isEdit || !token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/roles/${id}/`, {
          headers: { Authorization: `Token ${token}` },
        });
        if (cancelled) return;
        const role = res.data;
        setName(role.name || "");
        setSlug(role.slug || "");
        setDescription(role.description || "");
        setIsSystem(Boolean(role.is_system));
        setSlugTouched(true);
        const codes = role.permission_codes || [];
        if (role.permissions_detail?.length) {
          setSelected(
            new Set(role.permissions_detail.map((p) => String(p.id)))
          );
        } else {
          setSelected(
            new Set(
              permissions
                .filter((p) => codes.includes(p.code))
                .map((p) => String(p.id))
            )
          );
        }
      } catch {
        toast.error(t("roles.loadError", "Failed to load role"));
        navigate("/app/user/roles");
      } finally {
        if (!cancelled) setLoadingRole(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEdit, id, token, navigate, t, permissions]);

  const togglePerm = (permId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const key = String(permId);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleModule = (modulePerms, checked) => {
    setSelected((prev) => {
      const next = new Set(prev);
      modulePerms.forEach((p) => {
        const key = String(p.id);
        if (checked) next.add(key);
        else next.delete(key);
      });
      return next;
    });
  };

  const selectAll = () => {
    setSelected(new Set(permissions.map((p) => String(p.id))));
  };

  const clearAll = () => {
    setSelected(new Set());
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!name.trim()) {
      toast.error(t("validation.required"));
      return;
    }
    const finalSlug = (slugTouched ? slug : slugify(name)) || slugify(name);
    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        slug: finalSlug,
        description: description.trim(),
        permission_ids: Array.from(selected).map((x) => Number(x)),
      };
      const headers = { Authorization: `Token ${token}` };
      if (isEdit) {
        await axios.patch(`${API_BASE_URL}/roles/${id}/`, payload, {
          headers,
        });
        toast.success(t("roles.updateSuccess", "Role updated"));
      } else {
        await axios.post(`${API_BASE_URL}/roles/`, payload, { headers });
        toast.success(t("roles.createSuccess", "Role created"));
      }
      navigate("/app/user/roles");
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.slug?.[0] ||
        err.response?.data?.name?.[0] ||
        t("roles.saveError", "Failed to save role");
      toast.error(typeof msg === "string" ? msg : t("roles.saveError"));
    } finally {
      setLoading(false);
    }
  };

  if (catalogLoading || loadingRole) {
    return <FullPageLoader message="common.loading" />;
  }

  return (
    <FormShell>
      <PageHeader
        title={
          isEdit ? t("roles.edit", "Edit role") : t("roles.add", "Add role")
        }
        subtitle={t(
          "roles.formSubtitle",
          "Name the role and choose its page permissions"
        )}
        breadcrumbs={[
          { link: "/app/dashboard", label: "dashboard.title" },
          { link: "/app/user/roles", label: "roles.title" },
          {
            link: isEdit ? `/app/user/roles/${id}/edit` : "/app/user/roles/add",
            label: isEdit ? "roles.edit" : "roles.add",
          },
        ]}
        backButton="/app/user/roles"
        backButtonLabel={t("common.backToList")}
        icon={<Shield className="h-5 w-5" />}
        actions={[
          <Button
            key="cancel"
            type="button"
            variant="outline"
            onClick={() => navigate("/app/user/roles")}
          >
            <X className="h-4 w-4" />
            {t("common.cancel")}
          </Button>,
          <Button
            key="save"
            type="button"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {loading ? t("common.saving") : t("common.save")}
          </Button>,
        ]}
      />

      <FormBody>
        {/* Summary strip */}
        <div className="rounded-lg border border-border bg-card px-4 py-3 shadow-soft">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-foreground">
                {name || t("roles.untitled", "Untitled role")}
              </p>
              {isSystem ? (
                <Badge variant="secondary">{t("roles.system", "System")}</Badge>
              ) : (
                <Badge variant="outline">{t("roles.custom", "Custom")}</Badge>
              )}
            </div>
            <span className="text-xs font-semibold text-primary">
              {selectedCount}/{totalPerms} · {progress}%
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <FormGrid>
            <FormSection
              span="full"
              icon={<Shield className="h-4 w-4" />}
              title={t("roles.details", "Role details")}
              description={t(
                "roles.detailsHint",
                "Display name and short description for this role"
              )}
            >
              <FormRow cols={2}>
                <FormTextField
                  name="name"
                  label="roles.name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!slugTouched) setSlug(slugify(e.target.value));
                  }}
                  required
                  fullWidth
                />
                <FormTextField
                  name="slug"
                  label="roles.slug"
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(e.target.value);
                  }}
                  required
                  fullWidth
                  disabled={isSystem}
                />
              </FormRow>
              <FormTextField
                name="description"
                label="roles.description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                fullWidth
                multiline
                rows={2}
              />
            </FormSection>

            <FormSection
              span="full"
              icon={<CheckSquare className="h-4 w-4" />}
              title={t("roles.matrix", "Permission matrix")}
              description={t(
                "roles.matrixHint",
                "Select which pages and actions this role can use"
              )}
              actions={
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={selectAll}
                  >
                    <CheckSquare className="h-3.5 w-3.5" />
                    {t("roles.selectAll", "Select all")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearAll}
                  >
                    <Square className="h-3.5 w-3.5" />
                    {t("roles.clearAll", "Clear")}
                  </Button>
                </div>
              }
              noPadding
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-left">
                      <th className="sticky start-0 z-[1] bg-muted/40 px-4 py-3 font-medium backdrop-blur">
                        {t("roles.module", "Module")}
                      </th>
                      {ACTIONS.map((action) => (
                        <th
                          key={action}
                          className="px-2 py-3 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground"
                        >
                          {t(`permissions.actions.${action}`, action)}
                        </th>
                      ))}
                      <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t("roles.all", "All")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {modules.map(([module, perms]) => {
                      const byAction = Object.fromEntries(
                        perms.map((p) => [p.action, p])
                      );
                      const allChecked = perms.every((p) =>
                        selected.has(String(p.id))
                      );
                      const someChecked =
                        !allChecked &&
                        perms.some((p) => selected.has(String(p.id)));
                      return (
                        <tr
                          key={module}
                          className="border-b border-border/50 transition-colors last:border-0 hover:bg-muted/25"
                        >
                          <td className="sticky start-0 z-[1] bg-card px-4 py-3 font-medium capitalize backdrop-blur">
                            <div className="flex items-center gap-2">
                              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                                <Shield className="h-3.5 w-3.5" />
                              </span>
                              {t(`permissions.modules.${module}`, module)}
                            </div>
                          </td>
                          {ACTIONS.map((action) => {
                            const perm = byAction[action];
                            if (!perm) {
                              return (
                                <td
                                  key={action}
                                  className="px-2 py-3 text-center text-muted-foreground/40"
                                >
                                  —
                                </td>
                              );
                            }
                            return (
                              <td key={action} className="px-2 py-3 text-center">
                                <div className="flex justify-center">
                                  <Checkbox
                                    checked={selected.has(String(perm.id))}
                                    onCheckedChange={() => togglePerm(perm.id)}
                                    aria-label={perm.code}
                                  />
                                </div>
                              </td>
                            );
                          })}
                          <td className="px-3 py-3 text-center">
                            <div className="flex justify-center">
                              <Checkbox
                                checked={
                                  allChecked
                                    ? true
                                    : someChecked
                                      ? "indeterminate"
                                      : false
                                }
                                onCheckedChange={(v) =>
                                  toggleModule(perms, Boolean(v))
                                }
                                aria-label={`${module} all`}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </FormSection>
          </FormGrid>
        </form>
      </FormBody>

      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t border-border bg-card/95 px-4 py-3 shadow-elegant backdrop-blur md:hidden">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate("/app/user/roles")}
        >
          <X className="h-4 w-4" />
          {t("common.cancel")}
        </Button>
        <Button type="button" onClick={handleSubmit} disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {loading ? t("common.saving") : t("common.save")}
        </Button>
      </div>
    </FormShell>
  );
};

export default RoleForm;
