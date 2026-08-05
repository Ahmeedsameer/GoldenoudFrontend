import { Routes } from '@angular/router';

// ── Guards (kept eager — tiny functions, not worth splitting) ────
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';
import { sellerGuard } from './guards/seller.guard';
import { managerGuard } from './guards/manager.guard';
import { guestGuard } from './guards/guest.guard';
import { homeRedirectGuard } from './guards/home-redirect.guard';

export const routes: Routes = [

  // ── Admin dashboard ─────────────────────────────────────────
  {
    path: 'dashboard',
    loadComponent: () => import('./admin-dashboard-layout/admin-dashboard-layout.component').then(m => m.AdminDashboardLayoutComponent),
    canActivate: [authGuard],
    canMatch: [adminGuard],
    children: [
      {
        path: 'users',
        children: [
          { path: '', loadComponent: () => import('./users-managment/list/users-table/users-table.component').then(m => m.UsersTableComponent) },
          { path: 'create', loadComponent: () => import('./users-managment/create/create-new-user/create-new-user.component').then(m => m.CreateNewUserComponent) },
          { path: 'show/:id', loadComponent: () => import('./users-managment/show/single-user/single-user.component').then(m => m.SingleUserComponent) },
        ],
      },
      {
        path: 'shops',
        children: [
          { path: '', loadComponent: () => import('./admin/shop-managment/list/shop-list/shop-list.component').then(m => m.ShopListComponent) },
          { path: 'create', loadComponent: () => import('./admin/shop-managment/form/shop-form/shop-form.component').then(m => m.ShopFormComponent) },
          { path: 'edit/:id', loadComponent: () => import('./admin/shop-managment/form/shop-form/shop-form.component').then(m => m.ShopFormComponent) },
          { path: 'show/:id', loadComponent: () => import('./admin/shop-managment/show/shop-detail/shop-detail.component').then(m => m.ShopDetailComponent) },
        ],
      },
      {
        path: 'safe',
        children: [
          { path: 'shop/:shopId',  loadComponent: () => import('./admin/safe/admin-shop-safe.component').then(m => m.AdminShopSafeComponent) },
          { path: 'management',    loadComponent: () => import('./admin/safe/management/safe-management.component').then(m => m.SafeManagementComponent) },
          { path: ':safeId',       loadComponent: () => import('./admin/safe/detail/admin-safe-detail.component').then(m => m.AdminSafeDetailComponent) },
        ],
      },
      { path: 'conventions', loadComponent: () => import('./admin/convention/management/convention-management.component').then(m => m.ConventionManagementComponent) },
      {
        path: 'convention',
        children: [
          { path: 'shop/:shopId', loadComponent: () => import('./admin/convention/convention-shop.component').then(m => m.ConventionShopComponent) },
          { path: ':id',          loadComponent: () => import('./admin/convention/detail/convention-detail.component').then(m => m.ConventionDetailComponent) },
        ],
      },
      { path: 'currencies',          loadComponent: () => import('./admin/safe/currencies/currency-management.component').then(m => m.CurrencyManagementComponent) },
      { path: 'safe-types',          loadComponent: () => import('./admin/safe/safe-types/safe-type-management.component').then(m => m.SafeTypeManagementComponent) },
      { path: 'payment-methods',     loadComponent: () => import('./admin/safe/payment-methods/payment-method-management.component').then(m => m.PaymentMethodManagementComponent) },
      { path: 'transaction-reasons', loadComponent: () => import('./admin/safe/transaction-reasons/transaction-reason-management.component').then(m => m.TransactionReasonManagementComponent) },
      {
        path: 'stock',
        children: [
          { path: '', loadComponent: () => import('./admin/stock-managment/stock-page/stock-page.component').then(m => m.StockPageComponent) },
          { path: 'suppliers/create', loadComponent: () => import('./admin/stock-managment/suppliers/supplier-form/supplier-form.component').then(m => m.SupplierFormComponent) },
          { path: 'suppliers/edit/:id', loadComponent: () => import('./admin/stock-managment/suppliers/supplier-form/supplier-form.component').then(m => m.SupplierFormComponent) },
          { path: 'suppliers/:id', loadComponent: () => import('./admin/stock-managment/suppliers/supplier-profile/supplier-profile.component').then(m => m.SupplierProfileComponent) },
          { path: 'supplies/create', loadComponent: () => import('./admin/stock-managment/supplies/supply-form/supply-form.component').then(m => m.SupplyFormComponent) },
          { path: 'supplies/edit/:id', loadComponent: () => import('./admin/stock-managment/supplies/supply-form/supply-edit.component').then(m => m.SupplyEditComponent) },
          { path: 'supplies/show/:id', loadComponent: () => import('./admin/stock-managment/supplies/supply-detail/supply-detail.component').then(m => m.SupplyDetailComponent) },
        ],
      },
      {
        path: 'products',
        children: [
          { path: '', children: [
            { path: '', loadComponent: () => import('./admin/product-managment/product-list/product-list.component').then(m => m.ProductListComponent) },
            { path: 'view/:id', loadComponent: () => import('./admin/product-managment/product-detail/product-detail.component').then(m => m.ProductDetailComponent) },
            // Four independent Product Creation Forms — each its own
            // component/page, own FormGroup, own backend request validation.
            { path: 'create/raw-material',  loadComponent: () => import('./admin/product-managment/product-create/raw-material-create/raw-material-create.component').then(m => m.RawMaterialCreateComponent) },
            { path: 'create/packaging',     loadComponent: () => import('./admin/product-managment/product-create/packaging-create/packaging-create.component').then(m => m.PackagingCreateComponent) },
            { path: 'create/ready-product', loadComponent: () => import('./admin/product-managment/product-create/ready-product-create/ready-product-create.component').then(m => m.ReadyProductCreateComponent) },
            { path: 'create/compound',      loadComponent: () => import('./admin/product-managment/product-create/compound-create/compound-create.component').then(m => m.CompoundCreateComponent) },
          ] },
          {
            path: 'categories',
            children: [
              { path: '', loadComponent: () => import('./admin/category-managment/category-list/category-list.component').then(m => m.CategoryListComponent) },
              { path: 'create', loadComponent: () => import('./admin/category-managment/create-category/create-category.component').then(m => m.CreateCategoryComponent) },
              { path: 'edit/:id', loadComponent: () => import('./admin/category-managment/edit-category/edit-category.component').then(m => m.EditCategoryComponent) },
            ],
          },
        ],
      },
      {
        path: 'pricing',
        children: [
          { path: '', loadComponent: () => import('./admin/pricing-managment/pricing-list/pricing-list.component').then(m => m.PricingListComponent) },
          { path: ':id', loadComponent: () => import('./admin/pricing-managment/pricing-detail/pricing-detail.component').then(m => m.PricingDetailComponent) },
        ],
      },
      { path: 'reports',            loadComponent: () => import('./admin/reports/hub/reports-hub.component').then(m => m.ReportsHubComponent) },
      { path: 'reports/sales',      loadComponent: () => import('./admin/reports/sales/admin-sales-report.component').then(m => m.AdminSalesReportComponent) },
      { path: 'reports/financial',  loadComponent: () => import('./admin/reports/financial/admin-financial-report.component').then(m => m.AdminFinancialReportComponent) },
      { path: 'reports/perfume-consumption', loadComponent: () => import('./admin/reports/perfume-consumption/perfume-consumption-report.component').then(m => m.PerfumeConsumptionReportComponent) },
      { path: 'reports/branch-comparison', loadComponent: () => import('./admin/reports/branch-comparison/branch-comparison-report.component').then(m => m.BranchComparisonReportComponent) },
      { path: 'reports/monthly-profit', loadComponent: () => import('./admin/reports/monthly-profit/monthly-profit-report.component').then(m => m.MonthlyProfitReportComponent) },
      { path: 'reports/transfers', loadComponent: () => import('./admin/reports/transfers/transfer-reports.component').then(m => m.TransferReportsComponent) },
      { path: 'reports/suppliers', loadComponent: () => import('./admin/reports/suppliers/supplier-reports.component').then(m => m.SupplierReportsComponent) },
      { path: 'reports/payment-methods', loadComponent: () => import('./admin/reports/payment-methods/payment-method-reports.component').then(m => m.PaymentMethodReportsComponent) },
      { path: 'reports/transfer-invoices', loadComponent: () => import('./admin/reports/transfer-invoices/transfer-invoice-report.component').then(m => m.TransferInvoiceReportComponent) },
      { path: 'reports/salary-advances', loadComponent: () => import('./admin/reports/salary-advances/salary-advance-report.component').then(m => m.SalaryAdvanceReportComponent) },
      { path: 'reports/payroll', loadComponent: () => import('./admin/reports/payroll/payroll-report.component').then(m => m.PayrollReportComponent) },
      { path: 'reports/salary-payments', loadComponent: () => import('./admin/reports/salary-payments/salary-payment-report.component').then(m => m.SalaryPaymentReportComponent) },
      { path: 'reports/advance-installments', loadComponent: () => import('./admin/reports/advance-installments/advance-installment-report.component').then(m => m.AdvanceInstallmentReportComponent) },
      { path: 'reports/leave-deductions', loadComponent: () => import('./admin/reports/leave-deductions/leave-deduction-report.component').then(m => m.LeaveDeductionReportComponent) },
      { path: 'reports/waste', loadComponent: () => import('./admin/reports/waste/waste-reports.component').then(m => m.WasteReportsComponent) },
      { path: 'reports/counts', loadComponent: () => import('./admin/reports/counts/count-reports.component').then(m => m.CountReportsComponent) },
      // Reuses the exact same session-detail page as Branch Operations' own count screen
      // (branch-operations/counts/:id) — one component, two entry points, no duplicated logic.
      { path: 'reports/counts/:id', loadComponent: () => import('./admin/branch-operations/counts/count-detail/count-detail.component').then(m => m.CountDetailComponent) },
      { path: 'reports/adjustments', loadComponent: () => import('./admin/reports/adjustments/adjustment-reports.component').then(m => m.AdjustmentReportsComponent) },
      { path: 'reports/stock-movement', loadComponent: () => import('./admin/reports/stock-movement/stock-movement-report.component').then(m => m.StockMovementReportComponent) },
      { path: 'reports/inventory-ledger', loadComponent: () => import('./admin/reports/inventory-ledger/inventory-ledger.component').then(m => m.InventoryLedgerComponent) },
      { path: 'reports/batches', loadComponent: () => import('./admin/reports/batches/batch-traceability.component').then(m => m.BatchTraceabilityComponent) },
      { path: 'reports/inventory-audit', loadComponent: () => import('./admin/reports/audit/inventory-audit-report.component').then(m => m.InventoryAuditReportComponent) },
      { path: 'reports/required-materials', loadComponent: () => import('./admin/branch-operations/required-materials/required-materials.component').then(m => m.RequiredMaterialsComponent) },
      { path: 'branch-operations/dashboard',          loadComponent: () => import('./admin/branch-operations/branch-dashboard/branch-dashboard.component').then(m => m.BranchDashboardComponent) },
      { path: 'branch-operations/logistics-dashboard', loadComponent: () => import('./admin/branch-operations/logistics-dashboard/logistics-dashboard.component').then(m => m.LogisticsDashboardComponent) },
      { path: 'branch-operations/global-material-status', loadComponent: () => import('./admin/branch-operations/global-material-status/global-material-status.component').then(m => m.GlobalMaterialStatusComponent) },
      { path: 'branch-operations/transfers',         loadComponent: () => import('./admin/branch-operations/transfers/transfer-list/transfer-list.component').then(m => m.TransferListComponent) },
      { path: 'branch-operations/transfers/create',  loadComponent: () => import('./admin/branch-operations/transfers/transfer-create/transfer-create.component').then(m => m.TransferCreateComponent) },
      { path: 'branch-operations/transfers/:id',     loadComponent: () => import('./admin/branch-operations/transfers/transfer-detail/transfer-detail.component').then(m => m.TransferDetailComponent) },
      { path: 'branch-operations/stock-requests',        loadComponent: () => import('./admin/branch-operations/stock-requests/stock-request-list/stock-request-list.component').then(m => m.StockRequestListComponent) },
      { path: 'branch-operations/stock-requests/create', loadComponent: () => import('./admin/branch-operations/stock-requests/stock-request-create/stock-request-create.component').then(m => m.StockRequestCreateComponent) },
      { path: 'branch-operations/waste',             loadComponent: () => import('./admin/branch-operations/waste/waste-list.component').then(m => m.WasteListComponent) },
      { path: 'branch-operations/adjustments',       loadComponent: () => import('./admin/branch-operations/adjustments/adjustment-list.component').then(m => m.AdjustmentListComponent) },
      { path: 'branch-operations/counts',            loadComponent: () => import('./admin/branch-operations/counts/count-list/count-list.component').then(m => m.CountListComponent) },
      { path: 'branch-operations/counts/:id',        loadComponent: () => import('./admin/branch-operations/counts/count-detail/count-detail.component').then(m => m.CountDetailComponent) },
      { path: 'inventory-dashboard', loadComponent: () => import('./admin/stock/inventory-dashboard/inventory-dashboard.component').then(m => m.InventoryDashboardComponent) },
      { path: 'stock-intelligence', loadComponent: () => import('./admin/stock/admin-stock-intelligence.component').then(m => m.AdminStockIntelligenceComponent) },
      { path: 'pending-invoices',   loadComponent: () => import('./admin/invoices/admin-invoices.component').then(m => m.AdminInvoicesComponent) },
      { path: 'all-invoices',       loadComponent: () => import('./admin/all-invoices/all-invoices.component').then(m => m.AllInvoicesComponent) },
      { path: 'invoices/:id',       loadComponent: () => import('./seller/invoices/invoice-detail/invoice-detail.component').then(m => m.InvoiceDetailComponent) },
      { path: 'hr/employees',       loadComponent: () => import('./admin/hr/employees/hr-employees.component').then(m => m.HrEmployeesComponent) },
      { path: 'hr/transfers',       loadComponent: () => import('./admin/hr/transfers/hr-transfers.component').then(m => m.HrTransfersComponent) },
      { path: 'hr/attendance',      loadComponent: () => import('./admin/hr/attendance/hr-attendance.component').then(m => m.HrAttendanceComponent) },
      { path: 'hr/leaves',          loadComponent: () => import('./admin/hr/leaves/hr-leaves.component').then(m => m.HrLeavesComponent) },
      { path: 'hr/payroll',         loadComponent: () => import('./admin/hr/payroll/hr-payroll.component').then(m => m.HrPayrollComponent) },
      { path: 'hr/settlements',     loadComponent: () => import('./admin/hr/settlements/hr-settlements.component').then(m => m.HrSettlementsComponent) },
      { path: 'customers',          loadComponent: () => import('./admin/customers/customer-list/customer-list.component').then(m => m.CustomerListComponent) },
      { path: 'customers/reports',  loadComponent: () => import('./admin/customers/customer-reports/customer-reports.component').then(m => m.CustomerReportsComponent) },
      { path: 'customers/:id',      loadComponent: () => import('./admin/customers/customer-detail/customer-detail.component').then(m => m.CustomerDetailComponent) },
      { path: 'hr/reports',         loadComponent: () => import('./admin/hr/reports/hr-reports.component').then(m => m.HrReportsComponent) },
      { path: 'hr/schedule',        loadComponent: () => import('./admin/hr/schedule/hr-schedule.component').then(m => m.HrScheduleComponent) },
      { path: 'hr/bonuses-penalties', loadComponent: () => import('./admin/hr/bonuses-penalties/hr-bonuses-penalties.component').then(m => m.HrBonusesPenaltiesComponent) },
      { path: 'hr/advances',        loadComponent: () => import('./admin/hr/advances/hr-advances.component').then(m => m.HrAdvancesComponent) },
      { path: 'settings/company',   loadComponent: () => import('./admin/settings/company-settings/company-settings.component').then(m => m.CompanySettingsComponent) },
      { path: '', loadComponent: () => import('./admin/dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent), pathMatch: 'full' },
    ],
  },

  // ── Manager dashboard ───────────────────────────────────────
  {
    path: 'dashboard',
    loadComponent: () => import('./manager-dashboard-layout/manager-dashboard-layout.component').then(m => m.ManagerDashboardLayoutComponent),
    canActivate: [authGuard],
    canMatch: [managerGuard],
    children: [
      // ── Cashier / selling — managers sell exactly like sellers ──
      { path: 'cashier', loadComponent: () => import('./seller/cashier/cashier.component').then(m => m.CashierComponent) },
      {
        path: 'invoices',
        children: [
          { path: '', loadComponent: () => import('./seller/invoices/invoices-list/invoices-list.component').then(m => m.InvoicesListComponent) },
          { path: ':id', loadComponent: () => import('./seller/invoices/invoice-detail/invoice-detail.component').then(m => m.InvoiceDetailComponent) },
        ],
      },
      { path: 'override-requests',  loadComponent: () => import('./manager/override-requests/override-requests.component').then(m => m.OverrideRequestsComponent) },
      {
        path: 'pricing',
        children: [
          { path: '', loadComponent: () => import('./admin/pricing-managment/pricing-list/pricing-list.component').then(m => m.PricingListComponent) },
          { path: ':id', loadComponent: () => import('./admin/pricing-managment/pricing-detail/pricing-detail.component').then(m => m.PricingDetailComponent) },
        ],
      },
      { path: 'reports',            loadComponent: () => import('./manager/reports/reports.component').then(m => m.ReportsComponent) },
      { path: 'inventory-transfer', loadComponent: () => import('./manager/inventory-transfer/inventory-transfer.component').then(m => m.InventoryTransferComponent) },
      { path: 'branch-operations/dashboard',          loadComponent: () => import('./admin/branch-operations/branch-dashboard/branch-dashboard.component').then(m => m.BranchDashboardComponent) },
      { path: 'branch-operations/transfers',         loadComponent: () => import('./admin/branch-operations/transfers/transfer-list/transfer-list.component').then(m => m.TransferListComponent) },
      { path: 'branch-operations/transfers/create',  loadComponent: () => import('./admin/branch-operations/transfers/transfer-create/transfer-create.component').then(m => m.TransferCreateComponent) },
      { path: 'branch-operations/transfers/:id',     loadComponent: () => import('./admin/branch-operations/transfers/transfer-detail/transfer-detail.component').then(m => m.TransferDetailComponent) },
      { path: 'branch-operations/stock-requests',        loadComponent: () => import('./admin/branch-operations/stock-requests/stock-request-list/stock-request-list.component').then(m => m.StockRequestListComponent) },
      { path: 'branch-operations/stock-requests/create', loadComponent: () => import('./admin/branch-operations/stock-requests/stock-request-create/stock-request-create.component').then(m => m.StockRequestCreateComponent) },
      { path: 'branch-operations/required-materials',    loadComponent: () => import('./admin/branch-operations/required-materials/required-materials.component').then(m => m.RequiredMaterialsComponent) },
      { path: 'branch-operations/waste',             loadComponent: () => import('./admin/branch-operations/waste/waste-list.component').then(m => m.WasteListComponent) },
      // ── Purchase invoices — view + cancel only (create/edit/delete stay admin-only) ──
      { path: 'stock/supplies',           loadComponent: () => import('./admin/stock-managment/supplies/supplies-list/supplies-list.component').then(m => m.SuppliesListComponent) },
      { path: 'stock/supplies/show/:id',  loadComponent: () => import('./admin/stock-managment/supplies/supply-detail/supply-detail.component').then(m => m.SupplyDetailComponent) },
      // ── Sales invoices — branch-wide (every seller), with cancel ────
      { path: 'branch-invoices',          loadComponent: () => import('./manager/invoices/manager-invoices.component').then(m => m.ManagerInvoicesComponent) },
      // ── Customer Management — view only (see CustomerController scoping) ──
      { path: 'customers',          loadComponent: () => import('./admin/customers/customer-list/customer-list.component').then(m => m.CustomerListComponent) },
      { path: 'customers/reports',  loadComponent: () => import('./admin/customers/customer-reports/customer-reports.component').then(m => m.CustomerReportsComponent) },
      { path: 'customers/:id',      loadComponent: () => import('./admin/customers/customer-detail/customer-detail.component').then(m => m.CustomerDetailComponent) },
      { path: 'safe/my-shop',       loadComponent: () => import('./manager/safe/manager-safe.component').then(m => m.ManagerSafeComponent) },
      { path: 'safe/my-shop/:safeId/transactions', loadComponent: () => import('./manager/safe/transactions/manager-transactions.component').then(m => m.ManagerTransactionsComponent) },
      { path: 'conventions',        loadComponent: () => import('./manager/convention/manager-convention.component').then(m => m.ManagerConventionComponent) },
      { path: 'reconciliation',     loadComponent: () => import('./manager/safe-reconciliation/safe-reconciliation.component').then(m => m.SafeReconciliationComponent) },
      // ── HR self-service — identical to the Seller dashboard ──
      { path: 'my-hr',              loadComponent: () => import('./seller/my-hr/my-hr.component').then(m => m.MyHrComponent) },
      { path: 'my-schedule',        loadComponent: () => import('./seller/my-schedule/my-schedule.component').then(m => m.MyScheduleComponent) },
      { path: 'my-attendance',      loadComponent: () => import('./seller/my-attendance/my-attendance.component').then(m => m.MyAttendanceComponent) },
      { path: 'my-leave',           loadComponent: () => import('./seller/my-leave/my-leave.component').then(m => m.MyLeaveComponent) },
      { path: 'my-profile',         loadComponent: () => import('./seller/my-profile/my-profile.component').then(m => m.MyProfileComponent) },
      { path: 'my-sales',           loadComponent: () => import('./seller/my-sales/my-sales.component').then(m => m.MySalesComponent) },
      { path: 'my-advances',        loadComponent: () => import('./seller/my-advances/my-advances.component').then(m => m.MyAdvancesComponent) },
      { path: 'hr/advances',        loadComponent: () => import('./admin/hr/advances/hr-advances.component').then(m => m.HrAdvancesComponent) },
      { path: '', redirectTo: 'override-requests', pathMatch: 'full' },
    ],
  },

  // ── Seller dashboard ────────────────────────────────────────
  {
    path: 'dashboard',
    loadComponent: () => import('./seller-dashboard-layout/seller-dashboard-layout.component').then(m => m.SellerDashboardLayoutComponent),
    canActivate: [authGuard],
    canMatch: [sellerGuard],
    children: [
      { path: 'cashier', loadComponent: () => import('./seller/cashier/cashier.component').then(m => m.CashierComponent) },
      { path: 'my-hr', loadComponent: () => import('./seller/my-hr/my-hr.component').then(m => m.MyHrComponent) },
      { path: 'my-schedule',   loadComponent: () => import('./seller/my-schedule/my-schedule.component').then(m => m.MyScheduleComponent) },
      { path: 'my-attendance', loadComponent: () => import('./seller/my-attendance/my-attendance.component').then(m => m.MyAttendanceComponent) },
      { path: 'my-leave',      loadComponent: () => import('./seller/my-leave/my-leave.component').then(m => m.MyLeaveComponent) },
      { path: 'my-profile',    loadComponent: () => import('./seller/my-profile/my-profile.component').then(m => m.MyProfileComponent) },
      { path: 'my-sales',      loadComponent: () => import('./seller/my-sales/my-sales.component').then(m => m.MySalesComponent) },
      { path: 'my-advances',   loadComponent: () => import('./seller/my-advances/my-advances.component').then(m => m.MyAdvancesComponent) },
      {
        path: 'invoices',
        children: [
          { path: '', loadComponent: () => import('./seller/invoices/invoices-list/invoices-list.component').then(m => m.InvoicesListComponent) },
          { path: ':id', loadComponent: () => import('./seller/invoices/invoice-detail/invoice-detail.component').then(m => m.InvoiceDetailComponent) },
        ],
      },
      // Customer detail — read-only, scoped server-side to customers this
      // seller has personally sold to (see CustomerController::authorizeView()).
      { path: 'customers/:id', loadComponent: () => import('./admin/customers/customer-detail/customer-detail.component').then(m => m.CustomerDetailComponent) },
      { path: '', redirectTo: 'cashier', pathMatch: 'full' },
    ],
  },

  // ── Auth pages ──────────────────────────────────────────────
  {
    path: 'signin',
    loadComponent: () => import('./login/login.component').then(m => m.LoginComponent),
    canActivate: [guestGuard],
  },

  // ── Root — never a page of its own, always redirects ────────
  { path: '', pathMatch: 'full', canActivate: [homeRedirectGuard], children: [] },

  // ── 404 ─────────────────────────────────────────────────────
  { path: '**', loadComponent: () => import('./pages/other-page/not-found/not-found.component').then(m => m.NotFoundComponent) },
];
