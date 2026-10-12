import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Save,
  X,
  IdCard,
  Loader2,
  Upload,
  FileImage,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import useAdd from "../../../api/useAdd";
import { useAuth } from "../../../context/AuthContext";

import PageHeader from "../../../components/PageHeader";
import { FormTextField, FormCurrencyField } from "../../../components/FormFields";
import { InlineAlert } from "../../../components/AlertMessage";
import {
  FormShell,
  FormBody,
  FormGrid,
  FormSection,
  FormRow,
} from "../../../components/FormShell";

const ACCEPT = "image/jpeg,image/png,image/jpg,application/pdf";
const MAX_BYTES = 5 * 1024 * 1024;

const AddEmployee = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const auth = useAuth();
  const token = auth?.user?.token;
  const fileInputRef = useRef(null);

  const [formValues, setFormValues] = useState({
    name: "",
    fathername: "",
    contact: "",
    address: "",
    salary: "",
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");

  const { handleAdd, loading, error } = useAdd(
    "employees",
    token,
    "/app/hr/employees",
    t("employee.addSuccess"),
    t("employee.addError")
  );

  const validateField = (name, value) => {
    const next = { ...errors };
    if (name === "name") {
      if (!String(value || "").trim()) next.name = t("validation.required");
      else delete next.name;
    }
    if (name === "fathername") {
      if (!String(value || "").trim()) next.fathername = t("validation.required");
      else delete next.fathername;
    }
    if (name === "contact") {
      if (!String(value || "").trim()) next.contact = t("validation.required");
      else if (!/^[0-9+\-\s]{7,20}$/.test(value))
        next.contact = t("validation.invalidPhone");
      else delete next.contact;
    }
    if (name === "salary") {
      if (value === "" || value == null) next.salary = t("validation.required");
      else if (Number(value) < 0) next.salary = t("validation.minZero");
      else delete next.salary;
    }
    setErrors(next);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
    setTouched((prev) => ({ ...prev, [name]: true }));
    validateField(name, value);
  };

  const validateForm = () => {
    const formErrors = {};
    if (!formValues.name.trim()) formErrors.name = t("validation.required");
    if (!formValues.fathername.trim())
      formErrors.fathername = t("validation.required");
    if (!formValues.contact.trim()) formErrors.contact = t("validation.required");
    else if (!/^[0-9+\-\s]{7,20}$/.test(formValues.contact))
      formErrors.contact = t("validation.invalidPhone");
    if (formValues.salary === "" || formValues.salary == null)
      formErrors.salary = t("validation.required");
    else if (Number(formValues.salary) < 0)
      formErrors.salary = t("validation.minZero");
    setErrors(formErrors);
    setTouched({
      name: true,
      fathername: true,
      contact: true,
      address: true,
      salary: true,
    });
    return Object.keys(formErrors).length === 0;
  };

  const clearFile = () => {
    setSelectedFile(null);
    setFileError("");
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    setFileError("");
    if (!file) return;

    const validTypes = [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "application/pdf",
    ];
    if (!validTypes.includes(file.type)) {
      setFileError(t("validation.invalidFileType"));
      clearFile();
      return;
    }
    if (file.size > MAX_BYTES) {
      setFileError(t("validation.fileTooLarge"));
      clearFile();
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    if (file.type.startsWith("image/")) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl("");
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    if (fileError) return;

    const formData = new FormData();
    formData.append("name", formValues.name.trim());
    formData.append("fathername", formValues.fathername.trim());
    formData.append("contact", formValues.contact.trim());
    formData.append("address", formValues.address.trim());
    formData.append("salary", formValues.salary === "" ? "0" : formValues.salary);
    if (selectedFile) formData.append("tazkira", selectedFile);

    try {
      await handleAdd(formData);
    } catch (err) {
      console.error("Error creating employee:", err);
    }
  };

  const hasError = (field) => touched[field] && Boolean(errors[field]);
  const getErrorText = (field) => (touched[field] ? errors[field] : "");

  return (
    <FormShell>
      <PageHeader
        title={t("employee.add")}
        subtitle={t(
          "employee.addSubtitle",
          "Register a new employee profile"
        )}
        backButton="/app/hr/employees"
        backButtonLabel={t("common.backToList")}
        actions={[
          <Button
            key="cancel"
            variant="outline"
            onClick={() => navigate("/app/hr/employees")}
          >
            <X className="h-4 w-4" />
            {t("common.cancel")}
          </Button>,
          <Button key="save" onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {loading ? t("common.saving") : t("common.save")}
          </Button>,
        ]}
        icon={<IdCard className="h-5 w-5" />}
      />

      <FormBody>
        {error ? (
          <InlineAlert
            severity="error"
            message={error.message || t("common.errorOccurred")}
            title={t("common.error")}
          />
        ) : null}

        <FormGrid>
          <FormSection
            span="full"
            icon={<IdCard className="h-5 w-5" />}
            title={t("employee.personalInfo", "Personal information")}
            description={t(
              "employee.personalInfoSub",
              "Identity, contact, salary and ID document"
            )}
          >
            <FormRow cols={2}>
              <FormTextField
                name="name"
                label={t("employee.name")}
                value={formValues.name}
                onChange={handleChange}
                error={hasError("name")}
                helperText={getErrorText("name")}
                required
                fullWidth
                placeholder={t("employee.namePlaceholder", "Full name")}
              />
              <FormTextField
                name="fathername"
                label={t("employee.fathername")}
                value={formValues.fathername}
                onChange={handleChange}
                error={hasError("fathername")}
                helperText={getErrorText("fathername")}
                required
                fullWidth
                placeholder={t("employee.fatherPlaceholder", "Father's name")}
              />
            </FormRow>

            <FormRow cols={2}>
              <FormTextField
                name="contact"
                label={t("employee.contact")}
                value={formValues.contact}
                onChange={handleChange}
                error={hasError("contact")}
                helperText={getErrorText("contact")}
                required
                fullWidth
                placeholder={t("employee.contactPlaceholder", "Phone number")}
              />
              <FormCurrencyField
                name="salary"
                label={t("employee.salary")}
                value={formValues.salary}
                onChange={handleChange}
                error={hasError("salary")}
                helperText={getErrorText("salary")}
                currencySymbol="؋"
                required
                fullWidth
              />
            </FormRow>

            <FormTextField
              name="address"
              label={t("employee.address")}
              value={formValues.address}
              onChange={handleChange}
              error={hasError("address")}
              helperText={getErrorText("address")}
              fullWidth
              multiline
              rows={3}
              placeholder={t("employee.addressPlaceholder", "Home address")}
            />

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {t("employee.tazkira", "Tazkira / ID")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t(
                      "employee.tazkiraHelp",
                      "JPG, PNG or PDF — max 5MB"
                    )}
                  </p>
                </div>
                {selectedFile ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-destructive hover:text-destructive"
                    onClick={clearFile}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {t("common.clear", "Clear")}
                  </Button>
                ) : null}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPT}
                onChange={handleFileChange}
                className="hidden"
                id="employee-tazkira-upload"
              />

              <label
                htmlFor="employee-tazkira-upload"
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-8 text-center transition-colors hover:border-primary/40 hover:bg-muted/50",
                  fileError && "border-destructive/50 bg-destructive/5"
                )}
              >
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt=""
                    className="h-28 max-w-full rounded-md object-contain"
                  />
                ) : (
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                    {selectedFile ? (
                      <FileImage className="h-5 w-5" />
                    ) : (
                      <Upload className="h-5 w-5" />
                    )}
                  </span>
                )}
                <span className="text-sm font-medium text-foreground">
                  {selectedFile
                    ? selectedFile.name
                    : t("employee.uploadTazkira", "Upload ID document")}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t("employee.clickToBrowse", "Click to browse files")}
                </span>
              </label>
              {fileError ? (
                <p className="text-xs text-destructive">{fileError}</p>
              ) : null}
            </div>
          </FormSection>
        </FormGrid>
      </FormBody>

      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t border-border bg-card/95 px-4 py-3 shadow-elegant backdrop-blur md:hidden">
        <Button
          variant="outline"
          onClick={() => navigate("/app/hr/employees")}
        >
          <X className="h-4 w-4" />
          {t("common.cancel")}
        </Button>
        <Button onClick={handleSubmit} disabled={loading}>
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

export default AddEmployee;
