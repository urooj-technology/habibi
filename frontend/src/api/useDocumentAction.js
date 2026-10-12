import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import { API_BASE_URL } from "../config/env";

/**
 * Post, cancel, or run custom actions on ERP documents.
 * @param {string} apiPath e.g. "sales/customer-payments"
 */
export default function useDocumentAction(apiPath, token, workflowI18nPrefix = "salesWorkflow") {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const runAction = useMutation({
    mutationFn: async ({ id, action = "post", body = {} }) => {
      setLoading(true);
      const headers = token ? { Authorization: `Token ${token}` } : {};
      const url = `${API_BASE_URL}/${apiPath}/${id}/${action}/`;
      const response = await axios.post(url, body, { headers });
      return response.data;
    },
    onSuccess: (_data, variables) => {
      toast.success(t(`${workflowI18nPrefix}.actionSuccess`, { action: variables.action }), {
        position: "top-right",
        autoClose: 3000,
      });
      queryClient.invalidateQueries({ queryKey: [apiPath] });
    },
    onError: (error) => {
      const msg =
        error.response?.data?.detail ||
        error.message ||
        t(`${workflowI18nPrefix}.actionError`);
      toast.error(msg, { position: "top-right", autoClose: 4000 });
    },
    onSettled: () => setLoading(false),
  });

  const postDocument = (id) => runAction.mutate({ id, action: "post" });
  const cancelDocument = (id) => runAction.mutate({ id, action: "cancel" });
  const convertToInvoice = (id) =>
    runAction.mutate({ id, action: "convert-to-invoice" });
  const convertToBill = (id) =>
    runAction.mutate({ id, action: "convert-to-bill" });

  return {
    postDocument,
    cancelDocument,
    convertToInvoice,
    convertToBill,
    runAction: (id, action, body) => runAction.mutate({ id, action, body }),
    loading: loading || runAction.isPending,
  };
}
