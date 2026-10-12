import React, { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useParams,
  useLocation,
} from "react-router-dom";
import { I18nextProvider, useTranslation } from "react-i18next";
import i18n from "./lang/i18n";

import { createAppTheme } from "./theme";

// Layout
import AdminLayout from "./layouts/AdminLayout";
import AuthLayout from "./layouts/AuthLayout";

// Pages
import Dashboard from "./dashboard/Dashboard";
import Login from "./auth/Login";
import NotFound from "./components/NotFound";
import ResetPassword from "./auth/ResetPassword";
import VerifyOtp from "./auth/VerifyOtp";
import Profile from "./auth/Profile";

// Employee Pages
import EmployeeIndex from "./dashboard/pages/employee/EmployeeIndex";
import AddEmployee from "./dashboard/pages/employee/AddEmployee";
import EditEmployee from "./dashboard/pages/employee/EditEmployee";
import EmployeeDetails from "./dashboard/pages/employee/EmployeeDetails";
import PayrollRunIndex from "./dashboard/pages/hr/payroll/PayrollRunIndex";
import PayrollRunForm from "./dashboard/pages/hr/payroll/PayrollRunForm";
// Customer Pages
import CustomerIndex from "./dashboard/pages/customer/CustomerIndex";
import AddCustomer from "./dashboard/pages/customer/AddCustomer";
import EditCustomer from "./dashboard/pages/customer/EditCustomer";
import CustomerLedger from "./dashboard/pages/customer/CustomerLedger";

// Supplier Pages
import SupplierIndex from "./dashboard/pages/supplier/SupplierIndex";
import AddSupplier from "./dashboard/pages/supplier/AddSupplier";
import EditSupplier from "./dashboard/pages/supplier/EditSupplier";
import SupplierLedger from "./dashboard/pages/supplier/SupplierLedger";

// User Management Pages
import UserIndex from "./dashboard/pages/user/UserIndex";
import AddUser from "./dashboard/pages/user/AddUser";
import EditUser from "./dashboard/pages/user/EditUser";
import RoleIndex from "./dashboard/pages/user/RoleIndex";
import RoleForm from "./dashboard/pages/user/RoleForm";

// Sales Pages
import SalesIndex from "./dashboard/pages/sales/SalesIndex";
import AddSales from "./dashboard/pages/sales/AddSales";
import EditSales from "./dashboard/pages/sales/EditSales";
import SalesView from "./dashboard/pages/sales/SalesView";
import SaleReturnsIndex from "./dashboard/pages/sales/returns/SaleReturnsIndex";
import AddSaleReturn from "./dashboard/pages/sales/returns/AddSaleReturn";
import SaleReturnView from "./dashboard/pages/sales/returns/SaleReturnView";

// Purchase Pages
import PurchaseIndex from "./dashboard/pages/purchase/PurchaseIndex";
import AddPurchase from "./dashboard/pages/purchase/AddPurchase";
import EditPurchase from "./dashboard/pages/purchase/EditPurchase";
import ViewPurchase from "./dashboard/pages/purchase/ViewPurchase";

// Accounting (GL)
import AccountsIndex from "./dashboard/pages/accounting/AccountsIndex";
import AddAccountingAccount from "./dashboard/pages/accounting/AddAccountingAccount";
import EditAccountingAccount from "./dashboard/pages/accounting/EditAccountingAccount";
import JournalEntryIndex from "./dashboard/pages/accounting/JournalEntryIndex";
import JournalEntryForm from "./dashboard/pages/accounting/JournalEntryForm";
import JournalEntryDetail from "./dashboard/pages/accounting/JournalEntryDetail";
import ReportsHubPage from "./dashboard/pages/accounting/reports/ReportsHubPage";
import OperationalReportPage from "./dashboard/pages/accounting/reports/OperationalReportPage";
import TrialBalancePage from "./dashboard/pages/accounting/TrialBalancePage";
import NotificationsPage from "./dashboard/pages/notifications/NotificationsPage";
// Product Pages
import ProductIndex from "./dashboard/pages/product/ProductIndex";
import AddProduct from "./dashboard/pages/product/AddProduct";
import EditProduct from "./dashboard/pages/product/EditProduct";

// Inventory Pages
import InventoryIndex from "./dashboard/pages/inventory/InventoryIndex";
import AddInventory from "./dashboard/pages/inventory/AddInventory";
import EditInventory from "./dashboard/pages/inventory/EditInventory";

// Category Pages
import CategoryIndex from "./dashboard/pages/category/CategoryIndex";
import AddCategory from "./dashboard/pages/category/AddCategory";
import EditCategory from "./dashboard/pages/category/EditCategory";

// Context providers
import { AuthProvider, useAuth } from "./context/AuthContext";
import RequirePermission from "./components/RequirePermission";
import { SettingsProvider } from "./context/SettingsContext";
import AuthSessionWatcher from "./components/AuthSessionWatcher";
import BackupPage from "./dashboard/pages/backup/backup";

import OpeningBalanceForm from "./dashboard/pages/extended/OpeningBalanceForm";
import ExtendedDocumentIndex from "./dashboard/pages/extended/ExtendedDocumentIndex";
import { openingBalanceConfig } from "./dashboard/pages/extended/extendedConfigs";

// Protected route component
const ProtectedRoute = ({ children }) => {
  const auth = useAuth();

  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Redirect if authenticated
const RedirectIfAuthenticated = ({ children }) => {
  const auth = useAuth();

  if (auth.isAuthenticated) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return children;
};

/** Old links used /purchases/edit/:id and /purchases/view/:id; canonical routes are /purchases/:id/edit and /purchases/:id */
const LegacyPurchaseEditRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/app/purchases/${id}/edit`} replace />;
};
const LegacyPurchaseViewRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/app/purchases/${id}`} replace />;
};

/** Typo fix: /app/purchase/... → /app/purchases/... (supplier / purchase payments) */
const LegacyPurchaseSingularPathRedirect = () => {
  const location = useLocation();
  const to =
    location.pathname.replace(/^\/app\/purchase/, "/app/purchases") +
    location.search;
  return <Navigate to={to} replace />;
};

/** Old links used /contacts/suppliers/edit/:id — canonical is /contacts/suppliers/:id/edit */
const LegacySupplierEditRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/app/contacts/suppliers/${id}/edit`} replace />;
};
/** Old links used /contacts/customers/edit/:id — canonical is /contacts/customers/:id/edit */
const LegacyCustomerEditRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/app/contacts/customers/${id}/edit`} replace />;
};

// Apply document direction when language changes (RTL: Dari / Pashto)
const AppContent = () => {
  const { i18n } = useTranslation();

  useEffect(() => {
    const direction = ["da", "ps"].includes(i18n.language) ? "rtl" : "ltr";
    createAppTheme(direction);
    document.documentElement.setAttribute("dir", direction);
    document.documentElement.lang = i18n.language || "en";
  }, [i18n.language]);

  return (
      <SettingsProvider>
        <Router>
          <AuthSessionWatcher />
          <Routes>
            {/* Auth Routes */}
            <Route
              path="/login"
              element={
                <RedirectIfAuthenticated>
                  <AuthLayout>
                    <Login />
                  </AuthLayout>
                </RedirectIfAuthenticated>
              }
            />
            <Route
              path="/reset-password"
              element={
                <AuthLayout>
                  <ResetPassword />
                </AuthLayout>
              }
            />
            <Route
              path="/verify-otp"
              element={
                <AuthLayout>
                  <VerifyOtp />
                </AuthLayout>
              }
            />

            {/* Main App Routes */}
            <Route
              path="/app/*"
              element={
                <ProtectedRoute>
                  <AdminLayout>
                    <Routes>
                      <Route path="dashboard" element={<RequirePermission perm="dashboard.view"><Dashboard /></RequirePermission>} />
                      <Route path="notifications" element={<NotificationsPage />} />
                      <Route path="profile" element={<Profile />} />

                      <Route
                        path="purchase/*"
                        element={<LegacyPurchaseSingularPathRedirect />}
                      />
                      <Route
                        path="sales/payment/add"
                        element={<Navigate to="/app/sales" replace />}
                      />

                      <Route path="backup" element={<RequirePermission perm="backup.view"><BackupPage /></RequirePermission>} />

                      {/* User Management */}
                      <Route
                        path="user/*"
                        element={
                          <Routes>
                            <Route path="users" element={<RequirePermission perm="users.view"><UserIndex /></RequirePermission>} />
                            <Route path="users/add" element={<RequirePermission perm="users.create"><AddUser /></RequirePermission>} />
                            <Route path="users/:id/edit" element={<RequirePermission perm="users.edit"><EditUser /></RequirePermission>} />
                            <Route path="roles" element={<RequirePermission perm="roles.view"><RoleIndex /></RequirePermission>} />
                            <Route path="roles/add" element={<RequirePermission perm="roles.create"><RoleForm /></RequirePermission>} />
                            <Route path="roles/:id/edit" element={<RequirePermission perm="roles.edit"><RoleForm /></RequirePermission>} />
                          </Routes>
                        }
                      />

                      {/* Inventory Management */}
                      <Route
                        path="inventory/*"
                        element={
                          <Routes>
                            <Route path="products" element={<RequirePermission perm="inventory.view"><ProductIndex /></RequirePermission>} />
                            <Route path="products/add" element={<RequirePermission perm="inventory.create"><AddProduct /></RequirePermission>} />
                            <Route
                              path="products/:id/edit"
                              element={<RequirePermission perm="inventory.edit"><EditProduct /></RequirePermission>}
                            />
                            <Route
                              path="categories"
                              element={<RequirePermission perm="inventory.view"><CategoryIndex /></RequirePermission>}
                            />
                            <Route
                              path="categories/add"
                              element={<RequirePermission perm="inventory.create"><AddCategory /></RequirePermission>}
                            />
                            <Route
                              path="categories/:id/edit"
                              element={<RequirePermission perm="inventory.edit"><EditCategory /></RequirePermission>}
                            />
                            <Route path="stock" element={<RequirePermission perm="inventory.view"><InventoryIndex /></RequirePermission>} />
                            <Route path="stock/add" element={<RequirePermission perm="inventory.create"><AddInventory /></RequirePermission>} />
                            <Route
                              path="stock/:id/edit"
                              element={<RequirePermission perm="inventory.edit"><EditInventory /></RequirePermission>}
                            />
                          </Routes>
                        }
                      />

                      {/* Sales Management */}
                      <Route
                        path="sales/*"
                        element={
                          <Routes>
                            <Route index element={<RequirePermission perm="sales.view"><SalesIndex /></RequirePermission>} />
                            <Route path="add" element={<RequirePermission perm="sales.create"><AddSales /></RequirePermission>} />
                            <Route path="returns" element={<RequirePermission perm="sale_returns.view"><SaleReturnsIndex /></RequirePermission>} />
                            <Route path="returns/add" element={<RequirePermission perm="sale_returns.create"><AddSaleReturn /></RequirePermission>} />
                            <Route path="returns/:id" element={<RequirePermission perm="sale_returns.view"><SaleReturnView /></RequirePermission>} />
                            <Route path=":id/edit" element={<RequirePermission perm="sales.edit"><EditSales /></RequirePermission>} />
                            <Route path=":id" element={<RequirePermission perm="sales.view"><SalesView /></RequirePermission>} />
                          </Routes>
                        }
                      />

                      {/* Purchase Management */}
                      <Route
                        path="purchases/*"
                        element={
                          <Routes>
                            <Route index element={<RequirePermission perm="purchases.view"><PurchaseIndex /></RequirePermission>} />
                            <Route path="add" element={<RequirePermission perm="purchases.create"><AddPurchase /></RequirePermission>} />
                            <Route path="edit" element={<Navigate to="/app/purchases" replace />} />
                            <Route path="edit/:id" element={<LegacyPurchaseEditRedirect />} />
                            <Route path="view/:id" element={<LegacyPurchaseViewRedirect />} />
                            <Route path=":id/edit" element={<RequirePermission perm="purchases.edit"><EditPurchase /></RequirePermission>} />
                            <Route path=":id" element={<RequirePermission perm="purchases.view"><ViewPurchase /></RequirePermission>} />
                          </Routes>
                        }
                      />

                      {/* Accounting (GL) */}
                      <Route
                        path="accounting/*"
                        element={
                          <Routes>
                            <Route
                              index
                              element={
                                <Navigate
                                  to="/app/accounting/journal-entries"
                                  replace
                                />
                              }
                            />
                            <Route path="accounts" element={<RequirePermission perm="accounting.view"><AccountsIndex /></RequirePermission>} />
                            <Route
                              path="accounts/add"
                              element={<RequirePermission perm="accounting.create"><AddAccountingAccount /></RequirePermission>}
                            />
                            <Route
                              path="accounts/:id/edit"
                              element={<RequirePermission perm="accounting.edit"><EditAccountingAccount /></RequirePermission>}
                            />
                            <Route
                              path="journal-entries"
                              element={<RequirePermission perm="accounting.view"><JournalEntryIndex /></RequirePermission>}
                            />
                            <Route
                              path="journal-entries/add"
                              element={<RequirePermission perm="accounting.create"><JournalEntryForm /></RequirePermission>}
                            />
                            <Route
                              path="journal-entries/:id"
                              element={<RequirePermission perm="accounting.view"><JournalEntryDetail /></RequirePermission>}
                            />
                            <Route
                              path="journal-entries/:id/edit"
                              element={<RequirePermission perm="accounting.edit"><JournalEntryForm /></RequirePermission>}
                            />
                            <Route path="reports" element={<RequirePermission perm="accounting.view"><ReportsHubPage /></RequirePermission>} />
                            <Route
                              path="trial-balance"
                              element={<RequirePermission perm="accounting.view"><TrialBalancePage /></RequirePermission>}
                            />
                            <Route
                              path="reports/:reportId"
                              element={<RequirePermission perm="accounting.view"><OperationalReportPage /></RequirePermission>}
                            />
                            <Route
                              path="opening-balances"
                              element={<RequirePermission perm="accounting.view"><ExtendedDocumentIndex config={openingBalanceConfig} /></RequirePermission>}
                            />
                            <Route
                              path="opening-balances/add"
                              element={<RequirePermission perm="accounting.create"><OpeningBalanceForm /></RequirePermission>}
                            />
                            <Route
                              path="opening-balances/:id/edit"
                              element={<RequirePermission perm="accounting.edit"><OpeningBalanceForm /></RequirePermission>}
                            />
                          </Routes>
                        }
                      />

                      {/* Customer & Supplier Management */}
                      <Route
                        path="contacts/*"
                        element={
                          <Routes>
                            <Route path="customers" element={<RequirePermission perm="contacts.view"><CustomerIndex /></RequirePermission>} />
                            <Route path="customers/add" element={<RequirePermission perm="contacts.create"><AddCustomer /></RequirePermission>} />
                            <Route
                              path="customers/edit/:id"
                              element={<LegacyCustomerEditRedirect />}
                            />
                            <Route
                              path="customers/:id/edit"
                              element={<RequirePermission perm="contacts.edit"><EditCustomer /></RequirePermission>}
                            />
                            <Route
                              path="customers/:id/ledger"
                              element={<RequirePermission perm={["contacts.view","accounting.view"]}><CustomerLedger /></RequirePermission>}
                            />
                            <Route path="suppliers" element={<RequirePermission perm="contacts.view"><SupplierIndex /></RequirePermission>} />
                            <Route path="suppliers/add" element={<RequirePermission perm="contacts.create"><AddSupplier /></RequirePermission>} />
                            <Route
                              path="suppliers/edit/:id"
                              element={<LegacySupplierEditRedirect />}
                            />
                            <Route
                              path="suppliers/:id/edit"
                              element={<RequirePermission perm="contacts.edit"><EditSupplier /></RequirePermission>}
                            />
                            <Route
                              path="suppliers/:id/ledger"
                              element={<RequirePermission perm={["contacts.view","accounting.view"]}><SupplierLedger /></RequirePermission>}
                            />
                          </Routes>
                        }
                      />

                      {/* HR Management */}
                      <Route
                        path="hr/*"
                        element={
                          <Routes>
                            <Route
                              path="employees"
                              element={<RequirePermission perm="hr.view"><EmployeeIndex /></RequirePermission>}
                            />
                            <Route
                              path="employees/add"
                              element={<RequirePermission perm="hr.create"><AddEmployee /></RequirePermission>}
                            />
                            <Route
                              path="employees/:id/edit"
                              element={<RequirePermission perm="hr.edit"><EditEmployee /></RequirePermission>}
                            />
                            <Route
                              path="employees/:id"
                              element={<RequirePermission perm="hr.view"><EmployeeDetails /></RequirePermission>}
                            />
                            <Route path="payroll-runs" element={<RequirePermission perm="hr.view"><PayrollRunIndex /></RequirePermission>} />
                            <Route path="payroll-runs/add" element={<RequirePermission perm="hr.create"><PayrollRunForm /></RequirePermission>} />
                            <Route path="payroll-runs/:id/edit" element={<RequirePermission perm="hr.edit"><PayrollRunForm /></RequirePermission>} />
                          </Routes>
                        }
                      />

                      {/* Settings */}
                      <Route
                        path="settings"
                        element={<Navigate to="/app/dashboard" replace />}
                      />
                    </Routes>
                  </AdminLayout>
                </ProtectedRoute>
              }
            />

            {/* Redirect root based on authentication status */}
            <Route path="/" element={<AuthCheck />} />

            {/* 404 Page */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </SettingsProvider>
  );
};

function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </I18nextProvider>
  );
}

// Check auth status and redirect accordingly
const AuthCheck = () => {
  const auth = useAuth();

  if (auth.isAuthenticated) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return <Navigate to="/login" replace />;
};

export default App;

