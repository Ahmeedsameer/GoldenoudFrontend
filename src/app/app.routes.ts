import { Routes } from '@angular/router';

// ── Guards ──────────────────────────────────────────────────
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';
import { sellerGuard } from './guards/seller.guard';
import { managerGuard } from './guards/manager.guard';
import { guestGuard } from './guards/guest.guard';

// ── Admin layout ────────────────────────────────────────────
import { AdminDashboardLayoutComponent } from './admin-dashboard-layout/admin-dashboard-layout.component';

// ── Seller layout ────────────────────────────────────────────
import { SellerDashboardLayoutComponent } from './seller-dashboard-layout/seller-dashboard-layout.component';

// ── Manager layout ───────────────────────────────────────────
import { ManagerDashboardLayoutComponent } from './manager-dashboard-layout/manager-dashboard-layout.component';
import { CashierComponent } from './seller/cashier/cashier.component';
import { InvoicesListComponent as SellerInvoicesListComponent } from './seller/invoices/invoices-list/invoices-list.component';
import { InvoiceDetailComponent as SellerInvoiceDetailComponent } from './seller/invoices/invoice-detail/invoice-detail.component';

// ── Admin pages ──────────────────────────────────────────────
import { NotFoundComponent } from './pages/other-page/not-found/not-found.component';
import { LoginComponent } from './login/login.component';
import { CreateNewUserComponent } from './users-managment/create/create-new-user/create-new-user.component';
import { UsersTableComponent } from './users-managment/list/users-table/users-table.component';
import { SingleUserComponent } from './users-managment/show/single-user/single-user.component';
import { CategoryListComponent } from './admin/category-managment/category-list/category-list.component';
import { CreateCategoryComponent } from './admin/category-managment/create-category/create-category.component';
import { EditCategoryComponent } from './admin/category-managment/edit-category/edit-category.component';
import { ProductListComponent } from './admin/product-managment/product-list/product-list.component';
import { ShopListComponent as AdminShopListComponent } from './admin/shop-managment/list/shop-list/shop-list.component';
import { ShopFormComponent } from './admin/shop-managment/form/shop-form/shop-form.component';
import { ShopDetailComponent } from './admin/shop-managment/show/shop-detail/shop-detail.component';
import { StockPageComponent } from './admin/stock-managment/stock-page/stock-page.component';
import { SupplierFormComponent } from './admin/stock-managment/suppliers/supplier-form/supplier-form.component';
import { SupplyFormComponent } from './admin/stock-managment/supplies/supply-form/supply-form.component';
import { SupplyEditComponent } from './admin/stock-managment/supplies/supply-form/supply-edit.component';
import { SupplyDetailComponent } from './admin/stock-managment/supplies/supply-detail/supply-detail.component';
import { AdminShopSafeComponent } from './admin/safe/admin-shop-safe.component';
import { ConventionShopComponent } from './admin/convention/convention-shop.component';
import { ConventionDetailComponent } from './admin/convention/detail/convention-detail.component';
import { ConventionManagementComponent } from './admin/convention/management/convention-management.component';
import { ManagerConventionComponent } from './manager/convention/manager-convention.component';
import { AdminSafeDetailComponent } from './admin/safe/detail/admin-safe-detail.component';
import { SafeManagementComponent } from './admin/safe/management/safe-management.component';
import { CurrencyManagementComponent } from './admin/safe/currencies/currency-management.component';
import { SafeTypeManagementComponent } from './admin/safe/safe-types/safe-type-management.component';
import { TransactionReasonManagementComponent } from './admin/safe/transaction-reasons/transaction-reason-management.component';
import { ManagerSafeComponent } from './manager/safe/manager-safe.component';
import { ManagerTransactionsComponent } from './manager/safe/transactions/manager-transactions.component';
import { OverrideRequestsComponent } from './manager/override-requests/override-requests.component';
import { ReportsComponent } from './manager/reports/reports.component';
import { InventoryTransferComponent } from './manager/inventory-transfer/inventory-transfer.component';
import { SafeReconciliationComponent } from './manager/safe-reconciliation/safe-reconciliation.component';
import { AdminSalesReportComponent } from './admin/reports/sales/admin-sales-report.component';
import { AdminFinancialReportComponent } from './admin/reports/financial/admin-financial-report.component';
import { AdminDashboardComponent } from './admin/dashboard/admin-dashboard.component';
import { AdminStockIntelligenceComponent } from './admin/stock/admin-stock-intelligence.component';
import { AdminInvoicesComponent } from './admin/invoices/admin-invoices.component';
import { HrEmployeesComponent } from './admin/hr/employees/hr-employees.component';
import { HrTransfersComponent } from './admin/hr/transfers/hr-transfers.component';
import { HrAttendanceComponent } from './admin/hr/attendance/hr-attendance.component';
import { HrLeavesComponent } from './admin/hr/leaves/hr-leaves.component';
import { HrPayrollComponent } from './admin/hr/payroll/hr-payroll.component';
import { MyHrComponent } from './seller/my-hr/my-hr.component';
import { HrReportsComponent } from './admin/hr/reports/hr-reports.component';
import { HrScheduleComponent } from './admin/hr/schedule/hr-schedule.component';
import { HrBonusesPenaltiesComponent } from './admin/hr/bonuses-penalties/hr-bonuses-penalties.component';
import { HrAdvancesComponent } from './admin/hr/advances/hr-advances.component';
import { MyAdvancesComponent } from './seller/my-advances/my-advances.component';
import { MyScheduleComponent } from './seller/my-schedule/my-schedule.component';
import { MyAttendanceComponent } from './seller/my-attendance/my-attendance.component';
import { MyLeaveComponent } from './seller/my-leave/my-leave.component';
import { MyProfileComponent } from './seller/my-profile/my-profile.component';
import { MySalesComponent } from './seller/my-sales/my-sales.component';
import { CompanySettingsComponent } from './admin/settings/company-settings/company-settings.component';

export const routes: Routes = [

  // ── Admin dashboard ─────────────────────────────────────────
  {
    path: 'dashboard',
    component: AdminDashboardLayoutComponent,
    canActivate: [authGuard],
    canMatch: [adminGuard],
    children: [
      {
        path: 'users',
        children: [
          { path: '', component: UsersTableComponent },
          { path: 'create', component: CreateNewUserComponent },
          { path: 'show/:id', component: SingleUserComponent },
        ],
      },
      {
        path: 'shops',
        children: [
          { path: '', component: AdminShopListComponent },
          { path: 'create', component: ShopFormComponent },
          { path: 'edit/:id', component: ShopFormComponent },
          { path: 'show/:id', component: ShopDetailComponent },
        ],
      },
      {
        path: 'safe',
        children: [
          { path: 'shop/:shopId',  component: AdminShopSafeComponent },
          { path: 'management',    component: SafeManagementComponent },
          { path: ':safeId',       component: AdminSafeDetailComponent },
        ],
      },
      { path: 'conventions', component: ConventionManagementComponent },
      {
        path: 'convention',
        children: [
          { path: 'shop/:shopId', component: ConventionShopComponent },
          { path: ':id',          component: ConventionDetailComponent },
        ],
      },
      { path: 'currencies',          component: CurrencyManagementComponent },
      { path: 'safe-types',          component: SafeTypeManagementComponent },
      { path: 'transaction-reasons', component: TransactionReasonManagementComponent },
      {
        path: 'stock',
        children: [
          { path: '', component: StockPageComponent },
          { path: 'suppliers/create', component: SupplierFormComponent },
          { path: 'suppliers/edit/:id', component: SupplierFormComponent },
          { path: 'supplies/create', component: SupplyFormComponent },
          { path: 'supplies/edit/:id', component: SupplyEditComponent },
          { path: 'supplies/show/:id', component: SupplyDetailComponent },
        ],
      },
      {
        path: 'products',
        children: [
          { path: '', children: [{ path: '', component: ProductListComponent }] },
          {
            path: 'categories',
            children: [
              { path: '', component: CategoryListComponent },
              { path: 'create', component: CreateCategoryComponent },
              { path: 'edit/:id', component: EditCategoryComponent },
            ],
          },
        ],
      },
      { path: 'reports/sales',      component: AdminSalesReportComponent },
      { path: 'reports/financial',  component: AdminFinancialReportComponent },
      { path: 'stock-intelligence', component: AdminStockIntelligenceComponent },
      { path: 'pending-invoices',   component: AdminInvoicesComponent },
      { path: 'hr/employees',       component: HrEmployeesComponent },
      { path: 'hr/transfers',       component: HrTransfersComponent },
      { path: 'hr/attendance',      component: HrAttendanceComponent },
      { path: 'hr/leaves',          component: HrLeavesComponent },
      { path: 'hr/payroll',         component: HrPayrollComponent },
      { path: 'hr/reports',         component: HrReportsComponent },
      { path: 'hr/schedule',        component: HrScheduleComponent },
      { path: 'hr/bonuses-penalties', component: HrBonusesPenaltiesComponent },
      { path: 'hr/advances',        component: HrAdvancesComponent },
      { path: 'settings/company',   component: CompanySettingsComponent },
      { path: '', component: AdminDashboardComponent, pathMatch: 'full' },
    ],
  },

  // ── Manager dashboard ───────────────────────────────────────
  {
    path: 'dashboard',
    component: ManagerDashboardLayoutComponent,
    canActivate: [authGuard],
    canMatch: [managerGuard],
    children: [
      // ── Cashier / selling — managers sell exactly like sellers ──
      { path: 'cashier', component: CashierComponent },
      {
        path: 'invoices',
        children: [
          { path: '', component: SellerInvoicesListComponent },
          { path: ':id', component: SellerInvoiceDetailComponent },
        ],
      },
      { path: 'override-requests',  component: OverrideRequestsComponent },
      { path: 'reports',            component: ReportsComponent },
      { path: 'inventory-transfer', component: InventoryTransferComponent },
      { path: 'safe/my-shop',       component: ManagerSafeComponent },
      { path: 'safe/my-shop/:safeId/transactions', component: ManagerTransactionsComponent },
      { path: 'conventions',        component: ManagerConventionComponent },
      { path: 'reconciliation',     component: SafeReconciliationComponent },
      // ── HR self-service — identical to the Seller dashboard ──
      { path: 'my-hr',              component: MyHrComponent },
      { path: 'my-schedule',        component: MyScheduleComponent },
      { path: 'my-attendance',      component: MyAttendanceComponent },
      { path: 'my-leave',           component: MyLeaveComponent },
      { path: 'my-profile',         component: MyProfileComponent },
      { path: 'my-sales',           component: MySalesComponent },
      { path: 'my-advances',        component: MyAdvancesComponent },
      { path: 'hr/advances',        component: HrAdvancesComponent },
      { path: '', redirectTo: 'override-requests', pathMatch: 'full' },
    ],
  },

  // ── Seller dashboard ────────────────────────────────────────
  {
    path: 'dashboard',
    component: SellerDashboardLayoutComponent,
    canActivate: [authGuard],
    canMatch: [sellerGuard],
    children: [
      { path: 'cashier', component: CashierComponent },
      { path: 'my-hr', component: MyHrComponent },
      { path: 'my-schedule',   component: MyScheduleComponent },
      { path: 'my-attendance', component: MyAttendanceComponent },
      { path: 'my-leave',      component: MyLeaveComponent },
      { path: 'my-profile',    component: MyProfileComponent },
      { path: 'my-sales',      component: MySalesComponent },
      { path: 'my-advances',   component: MyAdvancesComponent },
      {
        path: 'invoices',
        children: [
          { path: '', component: SellerInvoicesListComponent },
          { path: ':id', component: SellerInvoiceDetailComponent },
        ],
      },
      { path: '', redirectTo: 'cashier', pathMatch: 'full' },
    ],
  },

  // ── Auth pages ──────────────────────────────────────────────
  {
    path: 'signin',
    component: LoginComponent,
    canActivate: [guestGuard],
  },

  // ── Root redirect ───────────────────────────────────────────
  { path: '', redirectTo: 'signin', pathMatch: 'full' },

  // ── 404 ─────────────────────────────────────────────────────
  { path: '**', component: NotFoundComponent },
];
