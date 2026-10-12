// src/api/useDelete.jsx
import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { AlertTriangle } from "lucide-react";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import { API_BASE_URL } from "../config/env";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const useDelete = (queryKey, token) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const headers = token ? { Authorization: `Token ${token}` } : {};
      await axios.delete(`${API_BASE_URL}/${queryKey}/${id}/`, { headers });
    },
    onSuccess: () => {
      toast.success(t("api.deleteSuccess"), {
        position: "top-right",
        autoClose: 3000,
      });
      queryClient.invalidateQueries(queryKey);
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || t("api.deleteError"), {
        position: "top-right",
        autoClose: 3000,
      });
    },
  });

  const handleDelete = (id) => {
    setItemToDelete(id);
    setConfirmDialogOpen(true);
  };

  const confirmDelete = () => {
    deleteMutation.mutate(itemToDelete);
    setConfirmDialogOpen(false);
  };

  const ConfirmDialog = ({
    message = t(
      `${queryKey.endsWith("s") ? queryKey : `${queryKey}s`}.deleteConfirmation`,
      { defaultValue: t("api.deleteConfirmation") }
    ),
  }) => (
    <Dialog open={confirmDialogOpen} onOpenChange={(next) => !next && setConfirmDialogOpen(false)}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <div className="flex flex-col items-center gap-2 text-center">
            <AlertTriangle className="h-16 w-16 text-destructive" />
            <DialogTitle className="text-xl font-bold">
              {t("api.deleteConfirmationTitle")}
            </DialogTitle>
          </div>
        </DialogHeader>
        <p className="text-center text-sm text-muted-foreground">{message}</p>
        <DialogFooter>
          <Button onClick={() => setConfirmDialogOpen(false)}>
            {t("api.cancel")}
          </Button>
          <Button variant="destructive" onClick={confirmDelete}>
            {t("api.delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return { handleDelete, ConfirmDialog };
};

export default useDelete;
