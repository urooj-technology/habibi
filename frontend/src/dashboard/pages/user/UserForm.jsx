import React, { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useFormik } from "formik";
import * as Yup from "yup";
import {
  AtSign,
  Camera,
  CheckCircle2,
  Circle,
  Eye,
  EyeOff,
  IdCard,
  KeyRound,
  Loader2,
  Phone,
  Save,
  Shield,
  UserRound,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import useFetchObjects from "../../../api/useFetchObjects";
import { useAuth } from "../../../context/AuthContext";
import PageHeader from "../../../components/PageHeader";
import { FormTextField } from "../../../components/FormFields";
import { InlineAlert } from "../../../components/AlertMessage";
import {
  FormShell,
  FormBody,
  FormGrid,
  FormSection,
  FormRow,
} from "../../../components/FormShell";

function passwordStrength(password = "") {
  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 10) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return Math.min(score, 4);
}

const STRENGTH_LABELS = ["", "weak", "fair", "good", "strong"];
const STRENGTH_COLORS = [
  "",
  "bg-destructive",
  "bg-amber-500",
  "bg-sky-500",
  "bg-emerald-500",
];

/**
 * Full create/edit user form design:
 * profile hero · progress · account/personal/security · role cards
 */
export default function UserForm({
  mode = "add",
  title,
  initialValues,
  onSubmit,
  loading = false,
  error = null,
  existingAvatarUrl = "",
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const auth = useAuth();
  const token = auth?.user?.token;
  const isEdit = mode === "edit";

  const { data: rolesData } = useFetchObjects(["roles"], "roles/", token);
  const roles = useMemo(() => {
    const list = Array.isArray(rolesData) ? rolesData : rolesData?.results || [];
    return list;
  }, [rolesData]);

  const fileInputRef = useRef(null);
  const [fileError, setFileError] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validationSchema = Yup.object({
    username: Yup.string()
      .required(t("validation.required"))
      .min(3, t("validation.minLength", { count: 3 }))
      .matches(/^[a-zA-Z0-9_]+$/, t("validation.alphanumeric")),
    email: Yup.string()
      .email(t("validation.invalidEmail"))
      .required(t("validation.required")),
    password: isEdit
      ? Yup.string().min(6, t("validation.minLength", { count: 6 }))
      : Yup.string()
          .required(t("validation.required"))
          .min(6, t("validation.minLength", { count: 6 })),
    confirmPassword: isEdit
      ? Yup.string().test(
          "passwords-match",
          t("validation.passwordMismatch"),
          function (value) {
            return !this.parent.password || this.parent.password === value;
          }
        )
      : Yup.string()
          .required(t("validation.required"))
          .oneOf([Yup.ref("password"), null], t("validation.passwordMismatch")),
    first_name: Yup.string(),
    last_name: Yup.string(),
    phone: Yup.string(),
    is_active: Yup.boolean(),
    role_id: Yup.mixed()
      .nullable()
      .required(t("user.roleRequired", "Please select a role")),
  });

  const formik = useFormik({
    initialValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      first_name: "",
      last_name: "",
      phone: "",
      is_active: true,
      role_id: "",
      ...initialValues,
    },
    enableReinitialize: true,
    validationSchema,
    onSubmit: (values) => {
      setFileError("");
      onSubmit?.(values, selectedFile);
    },
  });

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    setFileError("");
    if (!file) return;
    const validTypes = ["image/jpeg", "image/png", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      setFileError(t("validation.invalidImageType"));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setFileError(t("validation.fileTooLarge"));
      return;
    }
    setSelectedFile(file);
  };

  const clearPhoto = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const avatarPreview = selectedFile
    ? URL.createObjectURL(selectedFile)
    : existingAvatarUrl || "";

  const displayName =
    [formik.values.first_name, formik.values.last_name]
      .filter(Boolean)
      .join(" ") ||
    formik.values.username ||
    t("user.newUser", "New user");

  const selectedRole = roles.find(
    (r) => String(r.id) === String(formik.values.role_id)
  );

  const initials = (
    formik.values.first_name?.[0] ||
    formik.values.username?.[0] ||
    "U"
  ).toUpperCase();

  const strength = passwordStrength(formik.values.password);

  const checklist = [
    {
      key: "identity",
      label: t("user.stepIdentity", "Identity"),
      done: Boolean(formik.values.username && formik.values.email),
    },
    {
      key: "profile",
      label: t("user.stepProfile", "Profile"),
      done: Boolean(formik.values.first_name || formik.values.phone),
    },
    {
      key: "security",
      label: t("user.stepSecurity", "Security"),
      done: isEdit
        ? !formik.values.password ||
          (formik.values.password &&
            formik.values.password === formik.values.confirmPassword)
        : Boolean(
            formik.values.password &&
              formik.values.password === formik.values.confirmPassword
          ),
    },
    {
      key: "access",
      label: t("user.stepAccess", "Access"),
      done: Boolean(formik.values.role_id),
    },
  ];
  const doneCount = checklist.filter((c) => c.done).length;
  const progress = Math.round((doneCount / checklist.length) * 100);

  return (
    <FormShell>
      <PageHeader
        title={title}
        subtitle={
          isEdit
            ? t("user.editSubtitle", "Update account details and access")
            : t("user.addSubtitle", "Create a new team member account")
        }
        breadcrumbs={[
          { link: "/app/dashboard", label: "dashboard.title" },
          { link: "/app/user/users", label: "user.users" },
          {
            link: isEdit ? `/app/user/users/${formik.values.username}` : "/app/user/users/add",
            label: isEdit ? "user.editUser" : "user.addUser",
          },
        ]}
        backButton="/app/user/users"
        backButtonLabel={t("common.backToList")}
        icon={<UserRound className="h-5 w-5" />}
        actions={[
          <Button
            key="cancel"
            type="button"
            variant="outline"
            onClick={() => navigate("/app/user/users")}
          >
            <X className="h-4 w-4" />
            {t("common.cancel")}
          </Button>,
          <Button
            key="save"
            type="button"
            onClick={formik.handleSubmit}
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
        {error ? (
          <InlineAlert
            severity="error"
            message={
              typeof error === "string"
                ? error
                : error?.message || t("common.errorOccurred")
            }
            title={t("common.error")}
          />
        ) : null}

        {/* Progress strip */}
        <div className="rounded-lg border border-border bg-card px-4 py-3 shadow-soft">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-foreground">
              {t("user.formProgress", "Form progress")}
            </p>
            <span className="text-xs font-semibold text-primary">{progress}%</span>
          </div>
          <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex flex-wrap gap-3">
            {checklist.map((step) => (
              <div
                key={step.key}
                className="flex items-center gap-1.5 text-xs text-muted-foreground"
              >
                {step.done ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <Circle className="h-3.5 w-3.5" />
                )}
                <span
                  className={cn(step.done && "font-medium text-foreground")}
                >
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={formik.handleSubmit} encType="multipart/form-data">
          <FormGrid>
            {/* Profile hero panel */}
            <section className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-card shadow-soft md:col-span-4 md:sticky md:top-20 md:self-start">
              <div className="relative h-24 bg-[image:var(--gradient-primary)]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,hsl(var(--accent)/0.25),transparent_55%)]" />
              </div>
              <div className="relative flex flex-col items-center px-5 pb-5 pt-0">
                <div className="relative -mt-12 mb-3">
                  <Avatar className="h-24 w-24 border-4 border-card shadow-md">
                    <AvatarImage src={avatarPreview} alt={displayName} />
                    <AvatarFallback className="bg-primary/10 text-2xl font-semibold text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 end-0 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm transition hover:bg-muted"
                    title={t("user.uploadProfilePicture")}
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/jpg"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>

                <div className="w-full space-y-1 text-center">
                  <p className="truncate font-display text-lg font-semibold text-foreground">
                    {displayName}
                  </p>
                  <p className="flex items-center justify-center gap-1 truncate text-sm text-muted-foreground">
                    <AtSign className="h-3.5 w-3.5 shrink-0" />
                    {formik.values.email ||
                      t("user.emailPlaceholder", "email@example.com")}
                  </p>
                  {formik.values.phone ? (
                    <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      {formik.values.phone}
                    </p>
                  ) : null}
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                  <Badge
                    variant={formik.values.is_active ? "success" : "secondary"}
                  >
                    {formik.values.is_active
                      ? t("common.active")
                      : t("common.inactive")}
                  </Badge>
                  {selectedRole ? (
                    <Badge variant="default" className="gap-1">
                      <Shield className="h-3 w-3" />
                      {selectedRole.name}
                    </Badge>
                  ) : (
                    <Badge variant="outline">
                      {t("roles.selectRole", "Select a role")}
                    </Badge>
                  )}
                </div>

                {selectedFile ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-2 text-muted-foreground"
                    onClick={clearPhoto}
                  >
                    {t("user.removePhoto", "Remove photo")}
                  </Button>
                ) : null}

                {fileError ? (
                  <p className="mt-2 text-center text-xs text-destructive">
                    {fileError}
                  </p>
                ) : (
                  <p className="mt-2 text-center text-xs text-muted-foreground">
                    {t("user.photoHint", "JPG or PNG, max 2MB")}
                  </p>
                )}

                <div className="mt-5 w-full space-y-3 border-t border-border/70 pt-4">
                  <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {t("user.isActive")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formik.values.is_active
                          ? t("user.accountEnabled", "Can sign in")
                          : t("user.accountDisabled", "Cannot sign in")}
                      </p>
                    </div>
                    <Switch
                      checked={Boolean(formik.values.is_active)}
                      onCheckedChange={(checked) =>
                        formik.setFieldValue("is_active", checked)
                      }
                    />
                  </div>

                  {selectedRole ? (
                    <div className="rounded-lg border border-border bg-muted/20 px-3 py-3">
                      <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t("user.accessSummary", "Access summary")}
                      </p>
                      <p className="text-sm font-semibold text-foreground">
                        {selectedRole.name}
                      </p>
                      {selectedRole.description ? (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {selectedRole.description}
                        </p>
                      ) : null}
                      <p className="mt-2 text-xs text-muted-foreground">
                        {t(
                          "roles.permissionCount",
                          "{{count}} permissions",
                          {
                            count: Array.isArray(selectedRole.permission_codes)
                              ? selectedRole.permission_codes.length
                              : 0,
                          }
                        )}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            </section>

            {/* Main column */}
            <div className="flex min-w-0 flex-col gap-4 md:col-span-8 md:gap-6">
              <FormSection
                span="full"
                icon={<IdCard className="h-4 w-4" />}
                title={t("user.accountInformation")}
                description={t(
                  "user.accountInformationSub",
                  "Login credentials used to access the system"
                )}
              >
                <FormRow cols={2}>
                  <FormTextField
                    name="username"
                    label="user.username"
                    value={formik.values.username}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={
                      formik.touched.username && Boolean(formik.errors.username)
                    }
                    helperText={
                      formik.touched.username && formik.errors.username
                    }
                    required
                    fullWidth
                  />
                  <FormTextField
                    name="email"
                    label="user.email"
                    type="email"
                    value={formik.values.email}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.email && Boolean(formik.errors.email)}
                    helperText={formik.touched.email && formik.errors.email}
                    required
                    fullWidth
                  />
                </FormRow>
              </FormSection>

              <FormSection
                span="full"
                icon={<UserRound className="h-4 w-4" />}
                title={t("user.personalInformation")}
                description={t(
                  "user.personalInformationSub",
                  "Name and contact details"
                )}
              >
                <FormRow cols={2}>
                  <FormTextField
                    name="first_name"
                    label="user.firstName"
                    value={formik.values.first_name}
                    onChange={formik.handleChange}
                    fullWidth
                  />
                  <FormTextField
                    name="last_name"
                    label="user.lastName"
                    value={formik.values.last_name}
                    onChange={formik.handleChange}
                    fullWidth
                  />
                </FormRow>
                <FormTextField
                  name="phone"
                  label="user.phone"
                  value={formik.values.phone}
                  onChange={formik.handleChange}
                  fullWidth
                />
              </FormSection>

              <FormSection
                span="full"
                icon={<KeyRound className="h-4 w-4" />}
                title={t("user.security", "Security")}
                description={
                  isEdit
                    ? t(
                        "user.leaveBlankToKeep",
                        "Leave blank to keep the current password"
                      )
                    : t(
                        "user.passwordHint",
                        "Choose a strong password for this account"
                      )
                }
              >
                <FormRow cols={2}>
                  <div className="space-y-2">
                    <FormTextField
                      name="password"
                      label={isEdit ? "user.newPassword" : "user.password"}
                      type={showPassword ? "text" : "password"}
                      value={formik.values.password}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={
                        formik.touched.password &&
                        Boolean(formik.errors.password)
                      }
                      helperText={
                        formik.touched.password && formik.errors.password
                      }
                      required={!isEdit}
                      fullWidth
                      endAdornment={
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => setShowPassword((s) => !s)}
                          tabIndex={-1}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      }
                    />
                    {formik.values.password ? (
                      <div className="space-y-1 px-0.5">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4].map((level) => (
                            <div
                              key={level}
                              className={cn(
                                "h-1 flex-1 rounded-full bg-muted transition-colors",
                                strength >= level && STRENGTH_COLORS[strength]
                              )}
                            />
                          ))}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {t("user.passwordStrength", "Strength")}:{" "}
                          <span className="font-medium text-foreground">
                            {t(
                              `user.strength.${STRENGTH_LABELS[strength]}`,
                              STRENGTH_LABELS[strength]
                            )}
                          </span>
                        </p>
                      </div>
                    ) : null}
                  </div>
                  <FormTextField
                    name="confirmPassword"
                    label="user.confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formik.values.confirmPassword}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={
                      formik.touched.confirmPassword &&
                      Boolean(formik.errors.confirmPassword)
                    }
                    helperText={
                      formik.touched.confirmPassword &&
                      formik.errors.confirmPassword
                    }
                    required={!isEdit}
                    fullWidth
                    endAdornment={
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => setShowConfirmPassword((s) => !s)}
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    }
                  />
                </FormRow>
              </FormSection>

              <FormSection
                span="full"
                icon={<Shield className="h-4 w-4" />}
                title={t("roles.name", "Role")}
                description={t(
                  "user.roleAssignmentHint",
                  "Choose what this user can access in the system"
                )}
              >
                {formik.touched.role_id && formik.errors.role_id ? (
                  <p className="text-xs text-destructive">
                    {formik.errors.role_id}
                  </p>
                ) : null}
                {roles.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t("roles.empty", "No roles found")}
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {roles.map((role) => {
                      const selected =
                        String(formik.values.role_id) === String(role.id);
                      const permCount = Array.isArray(role.permission_codes)
                        ? role.permission_codes.length
                        : 0;
                      return (
                        <button
                          key={role.id}
                          type="button"
                          onClick={() => {
                            formik.setFieldValue("role_id", role.id);
                            formik.setFieldTouched("role_id", true, false);
                          }}
                          className={cn(
                            "group flex min-w-0 flex-col gap-2 rounded-xl border px-4 py-3.5 text-start transition",
                            selected
                              ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/25"
                              : "border-border bg-card hover:border-primary/35 hover:bg-muted/30"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-2.5">
                              <span
                                className={cn(
                                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                                  selected
                                    ? "bg-gradient-to-br from-primary to-emerald-700 text-primary-foreground"
                                    : "bg-muted text-muted-foreground group-hover:text-foreground"
                                )}
                              >
                                <Shield className="h-4 w-4" />
                              </span>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-foreground">
                                  {role.name}
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                  {role.is_system
                                    ? t("roles.system", "System")
                                    : t("roles.custom", "Custom")}
                                  {" · "}
                                  {t(
                                    "roles.permissionCount",
                                    "{{count}} permissions",
                                    { count: permCount }
                                  )}
                                </p>
                              </div>
                            </div>
                            <span
                              className={cn(
                                "mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                                selected
                                  ? "border-primary bg-primary"
                                  : "border-muted-foreground/35"
                              )}
                            >
                              {selected ? (
                                <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
                              ) : null}
                            </span>
                          </div>
                          {role.description ? (
                            <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                              {role.description}
                            </p>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                )}
              </FormSection>
            </div>
          </FormGrid>
        </form>
      </FormBody>

      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t border-border bg-card/95 px-4 py-3 shadow-elegant backdrop-blur md:hidden">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate("/app/user/users")}
        >
          <X className="h-4 w-4" />
          {t("common.cancel")}
        </Button>
        <Button type="button" onClick={formik.handleSubmit} disabled={loading}>
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
}

export function buildUserFormData(values, selectedFile, { isEdit = false } = {}) {
  const formData = new FormData();
  const { confirmPassword, ...userData } = values;

  if (isEdit && !userData.password) {
    delete userData.password;
  }

  Object.keys(userData).forEach((key) => {
    if (key === "role_id") {
      if (userData.role_id !== "" && userData.role_id != null) {
        formData.append("role_id", userData.role_id);
      }
      return;
    }
    if (key === "is_active") {
      formData.append("is_active", userData.is_active ? "true" : "false");
      return;
    }
    if (userData[key] !== undefined && userData[key] !== null) {
      formData.append(key, userData[key]);
    }
  });

  if (selectedFile) {
    formData.append("profile_picture", selectedFile);
  }

  return formData;
}
