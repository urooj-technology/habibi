import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { ArrowLeftRight, Loader2, Save } from "lucide-react";
import { toast } from "react-toastify";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "../../../context/AuthContext";
import useFetchObjects from "../../../api/useFetchObjects";
import { API_BASE_URL } from "../../../config/env";
import PageHeader from "../../../components/PageHeader";
import { InlineAlert } from "../../../components/AlertMessage";
import SearchableSelect from "../../../components/SearchableSelect";
import {
  FormShell,
  FormBody,
  FormGrid,
  FormSection,
  FormRow,
} from "../../../components/FormShell";
import { PosField } from "@/components/pos/PosShell";

const money = (n) =>
  Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const accountLabel = (a) =>
  a ? `${a.code} — ${a.name} (${a.currency || "AFN"})` : "";

/**
 * Convert between any GL accounts (Cash AFN ↔ Cash USD, etc.)
 * or convert customer AR / supplier AP between currencies.
 */
export default function CurrencyConversionPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const auth = useAuth();
  const token = auth?.user?.token;

  const [kind, setKind] = useState("account");
  const [contact, setContact] = useState(null);
  const [fromAccount, setFromAccount] = useState(null);
  const [toAccount, setToAccount] = useState(null);
  const [fromCurrency, setFromCurrency] = useState("AFN");
  const [toCurrency, setToCurrency] = useState("USD");
  const [amount, setAmount] = useState("");
  const [exchangeRate, setExchangeRate] = useState("");
  const [entryDate, setEntryDate] = useState(
    () => new Date().toISOString().slice(0, 10)
  );
  const [memo, setMemo] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const { data: accountsData, isLoading: accountsLoading } = useFetchObjects(
    ["gl-accounts-fx"],
    "accounting/accounts/?page_size=500",
    token
  );
  const { data: customersData, isLoading: customersLoading } = useFetchObjects(
    ["customers-fx"],
    kind === "customer" ? "customers/?page_size=500" : null,
    token
  );
  const { data: suppliersData, isLoading: suppliersLoading } = useFetchObjects(
    ["suppliers-fx"],
    kind === "supplier" ? "suppliers/?page_size=500" : null,
    token
  );

  const accounts = useMemo(() => {
    const list = Array.isArray(accountsData)
      ? accountsData
      : accountsData?.results || [];
    return list.filter((a) => a.is_active !== false);
  }, [accountsData]);

  const afnAccounts = useMemo(
    () => accounts.filter((a) => (a.currency || "AFN") === "AFN"),
    [accounts]
  );
  const usdAccounts = useMemo(
    () => accounts.filter((a) => (a.currency || "AFN") === "USD"),
    [accounts]
  );

  const contacts = useMemo(() => {
    const raw = kind === "customer" ? customersData : suppliersData;
    return Array.isArray(raw) ? raw : raw?.results || [];
  }, [kind, customersData, suppliersData]);

  const effectiveFromCcy =
    kind === "account"
      ? (fromAccount?.currency || "AFN").toUpperCase()
      : fromCurrency;
  const effectiveToCcy =
    kind === "account"
      ? (toAccount?.currency || "AFN").toUpperCase()
      : toCurrency;

  const convertedPreview = useMemo(() => {
    const amt = Number.parseFloat(amount) || 0;
    const rate = Number.parseFloat(exchangeRate) || 0;
    if (amt <= 0 || rate <= 0) return null;
    if (effectiveFromCcy === "USD" && effectiveToCcy === "AFN") {
      return { label: "AFN", value: amt * rate };
    }
    if (effectiveFromCcy === "AFN" && effectiveToCcy === "USD") {
      return { label: "USD", value: amt / rate };
    }
    return null;
  }, [amount, exchangeRate, effectiveFromCcy, effectiveToCcy]);

  const handleKindChange = (value) => {
    setKind(value);
    setContact(null);
    setFromAccount(null);
    setToAccount(null);
    setError("");
  };

  const swapAccounts = () => {
    if (kind === "account") {
      setFromAccount(toAccount);
      setToAccount(fromAccount);
    } else {
      setFromCurrency(toCurrency);
      setToCurrency(fromCurrency);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!amount || Number.parseFloat(amount) <= 0) {
      setError(
        t("currencyConversion.amountRequired", "Enter an amount greater than zero.")
      );
      return;
    }
    if (!exchangeRate || Number.parseFloat(exchangeRate) <= 0) {
      setError(
        t(
          "currencyConversion.rateRequired",
          "Exchange rate (AFN per 1 USD) is required."
        )
      );
      return;
    }

    let payload = {
      kind,
      amount: Number.parseFloat(amount).toFixed(2),
      exchange_rate: Number.parseFloat(exchangeRate).toFixed(6),
      entry_date: entryDate,
      memo: memo || "",
    };

    if (kind === "account") {
      if (!fromAccount?.id || !toAccount?.id) {
        setError(
          t(
            "currencyConversion.accountsRequired",
            "Select both from and to accounts."
          )
        );
        return;
      }
      if ((fromAccount.currency || "AFN") === (toAccount.currency || "AFN")) {
        setError(
          t(
            "currencyConversion.sameCurrency",
            "From and to currencies must be different."
          )
        );
        return;
      }
      payload = {
        ...payload,
        from_account_id: fromAccount.id,
        to_account_id: toAccount.id,
      };
    } else {
      if (!contact?.id) {
        setError(
          t(
            "currencyConversion.contactRequired",
            "Select a customer or supplier."
          )
        );
        return;
      }
      if (fromCurrency === toCurrency) {
        setError(
          t(
            "currencyConversion.sameCurrency",
            "From and to currencies must be different."
          )
        );
        return;
      }
      payload = {
        ...payload,
        contact_id: contact.id,
        from_currency: fromCurrency,
        to_currency: toCurrency,
      };
    }

    setSaving(true);
    try {
      const headers = { Authorization: `Token ${token}` };
      const res = await axios.post(
        `${API_BASE_URL}/accounting/currency-conversions/`,
        payload,
        { headers }
      );
      toast.success(
        t("currencyConversion.success", "Currency conversion posted.")
      );
      const jeId = res.data?.journal_entry_id;
      if (jeId) {
        navigate(`/app/accounting/journal-entries/${jeId}`);
      } else {
        navigate("/app/accounting/journal-entries");
      }
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        t("common.errorOccurred", "An error occurred");
      setError(String(msg));
      toast.error(String(msg));
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormShell>
      <PageHeader
        title={t("currencyConversion.title", "Currency conversion")}
        subtitle={t(
          "currencyConversion.subtitle",
          "Convert cash, bank, or any GL account between AFN and USD — or convert customer/supplier balances"
        )}
        breadcrumbs={[
          { link: "/app/dashboard", label: "navigation.dashboard" },
          { link: "/app/accounting/accounts", label: "accounting.title" },
          { label: "currencyConversion.title" },
        ]}
      />

      <FormBody>
        {error ? (
          <InlineAlert severity="error" title={t("common.error")} message={error} />
        ) : null}

        <form onSubmit={handleSubmit}>
          <FormGrid>
            <FormSection
              span="full"
              icon={<ArrowLeftRight className="h-5 w-5" />}
              title={t("currencyConversion.formTitle", "Conversion details")}
              description={t(
                "currencyConversion.formHint",
                "Example: Cash AFN → Cash USD, or customer AR USD → AR AFN. Rate = AFN per 1 USD."
              )}
            >
              <FormRow>
                <PosField label={t("currencyConversion.kind", "Convert")} required>
                  <Select value={kind} onValueChange={handleKindChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="account">
                        {t("currencyConversion.kindAccount", "GL accounts (cash, bank, …)")}
                      </SelectItem>
                      <SelectItem value="customer">
                        {t("currencyConversion.kindCustomer", "Customer receivable")}
                      </SelectItem>
                      <SelectItem value="supplier">
                        {t("currencyConversion.kindSupplier", "Supplier payable")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </PosField>

                <PosField label={t("common.date", "Date")} required>
                  <Input
                    type="date"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                  />
                </PosField>
              </FormRow>

              {kind === "account" ? (
                <FormRow>
                  <PosField
                    label={t("currencyConversion.fromAccount", "From account")}
                    required
                  >
                    <SearchableSelect
                      options={accounts}
                      value={fromAccount}
                      onChange={(acc) => {
                        setFromAccount(acc);
                        if (
                          acc &&
                          toAccount &&
                          (acc.currency || "AFN") === (toAccount.currency || "AFN")
                        ) {
                          setToAccount(null);
                        }
                      }}
                      loading={accountsLoading}
                      getOptionLabel={accountLabel}
                      placeholder="accounting.selectAccount"
                    />
                  </PosField>

                  <div className="flex items-end pb-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={swapAccounts}
                      className="w-full"
                    >
                      <ArrowLeftRight className="h-4 w-4" />
                      {t("currencyConversion.swap", "Swap")}
                    </Button>
                  </div>

                  <PosField
                    label={t("currencyConversion.toAccount", "To account")}
                    required
                  >
                    <SearchableSelect
                      options={
                        fromAccount
                          ? (fromAccount.currency || "AFN") === "AFN"
                            ? usdAccounts
                            : afnAccounts
                          : accounts
                      }
                      value={toAccount}
                      onChange={setToAccount}
                      loading={accountsLoading}
                      getOptionLabel={accountLabel}
                      placeholder="accounting.selectAccount"
                    />
                  </PosField>
                </FormRow>
              ) : (
                <>
                  <FormRow>
                    <PosField
                      label={
                        kind === "customer"
                          ? t("customer.name", "Customer")
                          : t("supplier.name", "Supplier")
                      }
                      required
                    >
                      <SearchableSelect
                        options={contacts}
                        value={contact}
                        onChange={setContact}
                        loading={
                          kind === "customer" ? customersLoading : suppliersLoading
                        }
                        getOptionLabel={(o) => o.name || `#${o.id}`}
                        placeholder={
                          kind === "customer"
                            ? "customer.selectCustomer"
                            : "supplier.selectSupplier"
                        }
                      />
                    </PosField>
                  </FormRow>
                  <FormRow>
                    <PosField
                      label={t("currencyConversion.fromCurrency", "From currency")}
                      required
                    >
                      <Select
                        value={fromCurrency}
                        onValueChange={(v) => {
                          setFromCurrency(v);
                          setToCurrency(v === "USD" ? "AFN" : "USD");
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="AFN">AFN</SelectItem>
                        </SelectContent>
                      </Select>
                    </PosField>
                    <div className="flex items-end pb-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={swapAccounts}
                        className="w-full"
                      >
                        <ArrowLeftRight className="h-4 w-4" />
                        {t("currencyConversion.swap", "Swap")}
                      </Button>
                    </div>
                    <PosField
                      label={t("currencyConversion.toCurrency", "To currency")}
                      required
                    >
                      <Select
                        value={toCurrency}
                        onValueChange={(v) => {
                          setToCurrency(v);
                          setFromCurrency(v === "USD" ? "AFN" : "USD");
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="AFN">AFN</SelectItem>
                        </SelectContent>
                      </Select>
                    </PosField>
                  </FormRow>
                </>
              )}

              <FormRow>
                <PosField
                  label={`${t("reports.amount", "Amount")} (${effectiveFromCcy})`}
                  required
                >
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="tabular-nums"
                  />
                </PosField>

                <PosField
                  label={t(
                    "currencyConversion.exchangeRate",
                    "Exchange rate (AFN per 1 USD)"
                  )}
                  required
                >
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={exchangeRate}
                    onChange={(e) => setExchangeRate(e.target.value)}
                    className="tabular-nums"
                  />
                </PosField>

                <PosField label={t("currencyConversion.convertsTo", "Converts to")}>
                  <div className="flex h-9 items-center rounded-md border border-border bg-muted/40 px-3 text-sm font-semibold tabular-nums">
                    {convertedPreview
                      ? `${money(convertedPreview.value)} ${convertedPreview.label}`
                      : "—"}
                  </div>
                </PosField>
              </FormRow>

              <FormRow>
                <PosField label={t("journal.memo", "Memo")} className="sm:col-span-3">
                  <Input
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                    placeholder={t(
                      "currencyConversion.memoPlaceholder",
                      "Optional note"
                    )}
                  />
                </PosField>
              </FormRow>

              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(-1)}
                  disabled={saving}
                >
                  {t("common.cancel", "Cancel")}
                </Button>
                <Button type="submit" disabled={saving || !token}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {t("currencyConversion.post", "Post conversion")}
                </Button>
              </div>
            </FormSection>
          </FormGrid>
        </form>
      </FormBody>
    </FormShell>
  );
}
