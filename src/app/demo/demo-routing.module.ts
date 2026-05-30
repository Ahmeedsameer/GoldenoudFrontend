import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ShopListComponent } from './components/shop-list/shop-list.component';
import { ShopDashboardComponent } from './components/shop-dashboard/shop-dashboard.component';
import { InvoicesListComponent } from './components/invoices-list/invoices-list.component';
import { InvoiceDetailComponent } from './components/invoice-detail/invoice-detail.component';
import { WorkersListComponent } from './components/workers-list/workers-list.component';
import { WorkerDetailComponent } from './components/worker-detail/worker-detail.component';
import { WorkerAttendanceComponent } from './components/worker-attendance/worker-attendance.component';
import { WorkerPerformanceComponent } from './components/worker-performance/worker-performance.component';
import { AnalyticsComponent } from './components/analytics/analytics.component';

const routes: Routes = [
  { path: '', component: ShopListComponent },
  { path: 'dashboard/1', component: ShopDashboardComponent },
  { path: 'invoices/1', component: InvoicesListComponent },
  { path: 'invoice-detail/1', component: InvoiceDetailComponent },
  { path: 'workers/1', component: WorkersListComponent },
  { path: 'worker-detail/1', component: WorkerDetailComponent },
  { path: 'worker-attendance/1', component: WorkerAttendanceComponent },
  { path: 'worker-performance/1', component: WorkerPerformanceComponent },
  { path: 'analytics/1', component: AnalyticsComponent },
  { path: 'new-invoice/1', component: ShopDashboardComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DemoRoutingModule { }