"use client";

import { useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const AddCustomerDialog = ({
  open,
  onClose,
  onAddCustomer,
  loading = false,
}) => {
  const { t } = useTranslation();
  const [customerForm, setCustomerForm] = useState({
    name: "",
    contact: "",
    address: "",
    notes: "",
  });

  const handleSubmit = () => {
    if (!customerForm.name.trim()) {
      return;
    }
    onAddCustomer(customerForm);
  };

  const handleClose = () => {
    setCustomerForm({ name: "", contact: "", address: "", notes: "" });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("customer.addNew")}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 mt-1">
          <div className="space-y-1.5">
            <Label htmlFor="customer-name">
              {t("customer.customerNameLabel")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="customer-name"
              value={customerForm.name}
              onChange={(e) =>
                setCustomerForm((prev) => ({ ...prev, name: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="customer-contact">{t("customer.contact")}</Label>
            <Input
              id="customer-contact"
              value={customerForm.contact}
              onChange={(e) =>
                setCustomerForm((prev) => ({
                  ...prev,
                  contact: e.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="customer-address">{t("customer.address")}</Label>
            <Textarea
              id="customer-address"
              rows={2}
              value={customerForm.address}
              onChange={(e) =>
                setCustomerForm((prev) => ({
                  ...prev,
                  address: e.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="customer-notes">{t("common.notes")}</Label>
            <Textarea
              id="customer-notes"
              rows={2}
              value={customerForm.notes}
              onChange={(e) =>
                setCustomerForm((prev) => ({ ...prev, notes: e.target.value }))
              }
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={handleClose}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !customerForm.name.trim()}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            {loading ? t("common.saving") : t("customer.addCustomer")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddCustomerDialog;
