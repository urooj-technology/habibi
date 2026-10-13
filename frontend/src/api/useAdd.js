import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "react-toastify";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config/env";

const useAdd = (
  queryKey,
  token = null, // Default token to null
  redirectPath = null, // Optional redirect path
  successMessage,
  errorMessage
) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [responseData, setResponseData] = useState("");

  const addMutation = useMutation({
    mutationFn: async (data) => {
      setLoading(true);
      console.log(`Sending request to ${API_BASE_URL}/${queryKey}/`, data);

      // Initialize headers object
      const headers = {};
      
      // Only set Content-Type for non-FormData objects
      if (!(data instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
      }

      // Add Authorization header only if the token is valid
      if (token && typeof token === "string" && token.trim().length > 0) {
        headers.Authorization = `Token ${token.trim()}`;
      }

      try {
        const response = await axios.post(
          `${API_BASE_URL}/${queryKey}/`,
          data,
          { headers }
        );
        console.log("API response:", response.data);
        setResponseData(response.data);
        return response.data;
      } catch (error) {
        console.error("API error:", error.response || error);
        throw error;
      }
    },
    onSuccess: (data) => {
      setLoading(false);
      toast.success(successMessage || t(`${queryKey}.createSuccess`, { defaultValue: t("api.success") }), {
        position: "top-right",
        autoClose: 3000,
      });
      setSuccess(true);
      console.log("Mutation successful:", data);

      // Invalidate the query to refresh the data if not login
      if (queryKey !== "login") {
        queryClient.invalidateQueries(queryKey);
      }

      // Defer navigate so page effects (e.g. clearDraft) can run first.
      if (redirectPath) {
        window.setTimeout(() => {
          navigate(redirectPath);
        }, 0);
      }
    },
    onError: (error) => {
      setLoading(false);

      // Handle specific backend errors if available
      const backendErrors = error.response?.data;
      if (backendErrors && typeof backendErrors === "object") {
        Object.keys(backendErrors).forEach((key) => {
          const errorMsg = Array.isArray(backendErrors[key])
            ? backendErrors[key].join(", ")
            : backendErrors[key];
          toast.error(t("api.fieldError", { message: errorMsg }), {
            position: "top-right",
            autoClose: 3000,
          });
        });
      } else {
        // If no specific backend error, show generic error message
        toast.error(
          errorMessage || t(`${queryKey}.createError`, { defaultValue: t("api.error") }),
          {
            position: "top-right",
            autoClose: 3000,
          }
        );
      }
    },
  });

  const handleAdd = (data) => {
    addMutation.mutate(data);
  };

  return {
    handleAdd,
    success,
    // Prefer React Query flag — stays true after success (local `success` alone
    // was easy to miss when navigate unmounted before effects ran).
    isSuccess: addMutation.isSuccess || success,
    error: addMutation.error,
    loading,
    responseData,
  };
};

export default useAdd;
