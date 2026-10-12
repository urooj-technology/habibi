import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { toast } from "react-toastify";
import { useQueryClient } from "@tanstack/react-query";
import { API_BASE_URL } from "../../../config/env";
import useFetchObjects from "../../../api/useFetchObjects";
import { useAuth } from "../../../context/AuthContext";
import { InlineAlert } from "../../../components/AlertMessage";
import { FullPageLoader } from "../../../components/LoadingScreen";
import { FormShell } from "../../../components/FormShell";
import UserForm, { buildUserFormData } from "./UserForm";

const EditUser = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const auth = useAuth();
  const token = auth?.user?.token;
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [updateError, setUpdateError] = useState(null);

  const {
    data: users,
    isLoading: isLoadingUsers,
    error: fetchError,
  } = useFetchObjects("user-list", "users", token);

  const user = useMemo(
    () => users?.find((u) => u.id === Number.parseInt(id, 10)),
    [users, id]
  );

  const initialValues = useMemo(() => {
    if (!user) return undefined;
    return {
      username: user.username || "",
      email: user.email || "",
      password: "",
      confirmPassword: "",
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      phone: user.phone || "",
      is_active: user.is_active ?? true,
      role_id: user.role_id || user.role_detail?.id || "",
    };
  }, [user]);

  const handleSubmit = async (values, file) => {
    setLoading(true);
    setUpdateError(null);
    try {
      const formData = buildUserFormData(values, file, { isEdit: true });
      await axios.patch(`${API_BASE_URL}/users/${id}/edit/`, formData, {
        headers: { Authorization: `Token ${token}` },
      });
      toast.success(t("user.updateSuccess"), {
        position: "top-right",
        autoClose: 3000,
      });
      queryClient.invalidateQueries("user-list");
      navigate("/app/user/users");
    } catch (error) {
      const msg =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        t("user.updateError");
      setUpdateError(msg);
      toast.error(msg, { position: "top-right", autoClose: 3000 });
    } finally {
      setLoading(false);
    }
  };

  if (isLoadingUsers || (users && !user && !fetchError)) {
    return <FullPageLoader />;
  }

  if (!user) {
    return (
      <FormShell>
        <InlineAlert
          severity="error"
          message={t("user.notFound")}
          title={t("common.error")}
        />
      </FormShell>
    );
  }

  return (
    <UserForm
      mode="edit"
      title={t("user.editUser")}
      initialValues={initialValues}
      loading={loading}
      error={updateError || fetchError}
      existingAvatarUrl={user.profile_picture || ""}
      onSubmit={handleSubmit}
    />
  );
};

export default EditUser;
