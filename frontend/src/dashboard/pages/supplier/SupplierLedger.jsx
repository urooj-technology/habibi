import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import ContactLedgerPageContent from "../../components/contactLedger/ContactLedgerPageContent";
import { useAuth } from "../../../context/AuthContext";
import { API_BASE_URL } from "../../../config/env";

function defaultRange() {
  const n = new Date();
  const from = new Date(n.getFullYear(), n.getMonth(), 1);
  return { from: from.toISOString().slice(0, 10), to: n.toISOString().slice(0, 10) };
}

const SupplierLedger = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const auth = useAuth();
  const token = auth?.user?.token;

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [supplier, setSupplier] = useState(null);
  const [ledgerData, setLedgerData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [exportAnchorEl, setExportAnchorEl] = useState(null);
  const exportOpen = Boolean(exportAnchorEl);
  const [search, setSearch] = useState("");
  const [transactionType, setTransactionType] = useState("");
  const [status, setStatus] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    const fetchSupplier = async () => {
      if (!token) return;
      try {
        const response = await fetch(`${API_BASE_URL}/suppliers/${id}/`, {
          headers: { Authorization: `Token ${token}` },
        });
        if (!response.ok) throw new Error(t("supplier.fetchError"));
        const data = await response.json();
        setSupplier(data);
      } catch (e) {
        setError(e.message);
      }
    };
    fetchSupplier();
  }, [id, token, t]);

  useEffect(() => {
    const range = defaultRange();
    setFrom(range.from);
    setTo(range.to);
  }, []);

  useEffect(() => {
    if (!from || !to || !token) return;
    const fetchLedger = async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ from, to });
        if (search) params.append("search", search);
        if (transactionType) params.append("transaction_type", transactionType);
        if (status) params.append("status", status);
        if (amountMin) params.append("amount_min", amountMin);
        if (amountMax) params.append("amount_max", amountMax);
        params.append("page", String(page + 1));
        params.append("page_size", String(pageSize));
        const response = await fetch(
          `${API_BASE_URL}/suppliers/${id}/ledger/?${params.toString()}`,
          { headers: { Authorization: `Token ${token}` } }
        );
        if (!response.ok) {
          const err = await response.text();
          throw new Error(err || t("common.errorLoadingData"));
        }
        const data = await response.json();
        setLedgerData(data);
      } catch (e) {
        setError(e.message);
        setLedgerData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchLedger();
  }, [id, from, to, token, search, transactionType, status, amountMin, amountMax, page, pageSize, t]);

  const handleRefresh = () => {
    const currentFrom = from;
    const currentTo = to;
    setFrom("");
    setTo("");
    setTimeout(() => {
      setFrom(currentFrom);
      setTo(currentTo);
    }, 0);
  };

  const downloadExport = async (kind) => {
    if (!from || !to || !token) return;
    try {
      const params = new URLSearchParams({ from, to });
      if (search) params.append("search", search);
      if (transactionType) params.append("transaction_type", transactionType);
      if (status) params.append("status", status);
      if (amountMin) params.append("amount_min", amountMin);
      if (amountMax) params.append("amount_max", amountMax);
      params.append("page", "1");
      params.append("page_size", "100");
      const url = `${API_BASE_URL}/suppliers/${id}/ledger/export/${kind}/?${params.toString()}`;
      const headers = { Authorization: `Token ${token}` };
      const resp = await fetch(url, { headers });
      if (!resp.ok) {
        const txt = await resp.text().catch(() => "");
        throw new Error(txt || `${t("common.errorOccurred")} (${resp.status})`);
      }
      const blob = await resp.blob();
      const cd = resp.headers.get("content-disposition") || "";
      const m = cd.match(/filename="([^"]+)"/);
      const filename =
        (m && m[1]) ||
        (kind === "excel" ? "supplier-ledger.xlsx" : kind === "csv" ? "supplier-ledger.csv" : "supplier-ledger.pdf");
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (e) {
      // eslint-disable-next-line no-alert
      window.alert(e?.message || t("common.errorOccurred"));
    }
  };

  return (
    <ContactLedgerPageContent
      t={t}
      navigate={navigate}
      pageTitleKey="supplier.ledger"
      pageTitleDefault={t("supplier.ledger")}
      contactName={supplier?.name}
      contactId={id}
      from={from}
      setFrom={setFrom}
      to={to}
      setTo={setTo}
      loading={loading}
      error={error}
      ledgerData={ledgerData}
      breadcrumbs={[
        { link: "/app/dashboard", label: "navigation.dashboard" },
        { link: "/app/contacts", label: "navigation.contacts" },
        { link: "/app/contacts/suppliers", label: "navigation.suppliers" },
        { link: `/app/contacts/suppliers/${id}`, label: supplier?.name || `#${id}` },
        { link: `/app/contacts/suppliers/${id}/ledger`, label: "supplier.ledger" },
      ]}
      backPath={`/app/contacts/suppliers/${id}`}
      exportAnchorEl={exportAnchorEl}
      setExportAnchorEl={setExportAnchorEl}
      exportOpen={exportOpen}
      downloadExport={downloadExport}
      handleRefresh={handleRefresh}
      ledgerVariant="supplier"
      search={search}
      setSearch={setSearch}
      transactionType={transactionType}
      setTransactionType={setTransactionType}
      status={status}
      setStatus={setStatus}
      amountMin={amountMin}
      setAmountMin={setAmountMin}
      amountMax={amountMax}
      setAmountMax={setAmountMax}
      page={page}
      setPage={setPage}
      pageSize={pageSize}
      setPageSize={setPageSize}
    />
  );
};

export default SupplierLedger;
