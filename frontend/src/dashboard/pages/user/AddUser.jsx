import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import useAdd from "../../../api/useAdd";
import { useAuth } from "../../../context/AuthContext";
import UserForm, { buildUserFormData } from "./UserForm";

const AddUser = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const auth = useAuth();
  const token = auth?.user?.token;

  const { handleAdd, loading, isSuccess, error } = useAdd(
    "register",
    token,
    "/app/user/users",
    t("user.addSuccess"),
    t("user.addError")
  );

  useEffect(() => {
    if (isSuccess) navigate("/app/user/users");
  }, [isSuccess, navigate]);

  return (
    <UserForm
      mode="add"
      title={t("user.addUser")}
      loading={loading}
      error={error}
      onSubmit={(values, file) => {
        handleAdd(buildUserFormData(values, file, { isEdit: false }));
      }}
    />
  );
};

export default AddUser;
