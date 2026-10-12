// src/api/useUpdate.jsx
import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import { API_BASE_URL } from "../config/env";
import { Button } from "@/components/ui/button";

const useUpdate = (queryKey, token, redirectPath, successMessage, errorMessage) => {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      setLoading(true);
      const headers = token ? { Authorization: `Token ${token}` } : {};
      try {
        const response = await axios.patch(
          `${API_BASE_URL}/${queryKey}/${id}/`,
          data,
          { headers }
        );
        return response.data;
      } catch (error) {
        throw new Error(
          error.response?.data?.detail ||
            errorMessage ||
            t(`${queryKey}.updateError`, { defaultValue: t("api.updateError") })
        );
      }
    },
    onSuccess: () => {
      setSuccess(true);
      setLoading(false);
      toast.success(
        successMessage ||
          t(`${queryKey}.updateSuccess`, { defaultValue: t("api.updateSuccess") }),
        {
          position: "top-right",
          autoClose: 3000,
        }
      );
      queryClient.invalidateQueries(queryKey);
      if (redirectPath) {
        navigate(redirectPath);
      }
    },
    onError: (error) => {
      setSuccess(false);
      setLoading(false);
      toast.error(error.message, {
        position: "top-right",
        autoClose: 3000,
      });
    },
    onSettled: () => {
      setLoading(false);
    },
  });

  const handleUpdate = (id, data) => {
    updateMutation.mutate({ id, data });
  };

  const Buttons = ({ onSubmit }) => (
    <div className="flex justify-end gap-2 mt-4">
      <Button disabled={loading}>
        {t("api.cancel")}
      </Button>
      <Button onClick={onSubmit} disabled={loading}>
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {loading ? t("api.updating") : t("api.update")}
      </Button>
    </div>
  );

  return {
    handleUpdate,
    Buttons,
    loading,
    success,
    setSuccess,
  };
};

export default useUpdate;
