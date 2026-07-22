import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs/operators';
import { SafeService } from '../../../services/safe.service';
import { SafeTransaction, TransactionType, Currency } from '../../../models/safe.model';
import { ListManager } from '../../../services/list-manager';
import { LoadingComponent } from '../../../loading/loading.component';
import { PaginationComponent } from '../../../pagination/pagination.component';
import { DatePickerComponent } from '../../../shared/components/form/date-picker/date-picker.component';

@Component({
  selector: 'app-manager-transactions',
  imports: [CommonModule, LoadingComponent, PaginationComponent, DatePickerComponent],
  templateUrl: './manager-transactions.component.html',
})
export class ManagerTransactionsComponent implements OnInit {
  private safeService = inject(SafeService);
  private route = inject(ActivatedRoute);

  safeId!: number;
  currencies: Currency[] = [];

  list = new ListManager<SafeTransaction>(
    (params) => this.safeService.getManagerTransactions(this.safeId, params).pipe(map((r) => r.data))
  );

  typeOptions = [
    { value: '', label: 'كل الأنواع' },
    { value: 'sale', label: 'مبيعات' },
    { value: 'refund', label: 'مرتجع' },
    { value: 'admin_deposit', label: 'إيداع (أدمن)' },
    { value: 'admin_withdrawal', label: 'سحب (أدمن)' },
    { value: 'manager_deposit', label: 'إيداع (مدير)' },
    { value: 'manager_expense', label: 'مصروف (مدير)' },
    { value: 'transfer_in', label: 'تحويل وارد' },
    { value: 'transfer_out', label: 'تحويل صادر' },
  ];

  ngOnInit(): void {
    this.safeId = +this.route.snapshot.params['safeId'];
    this.list.load();
    this.safeService.getManagerCurrencies({ active_only: true }).subscribe({ next: (r) => this.currencies = r.data });
  }

  setTypeFilter(val: string)      { this.list.setFilter('type',        val || undefined); }
  setDirectionFilter(val: string) { this.list.setFilter('direction',   val || undefined); }
  setCurrencyFilter(val: string)  { this.list.setFilter('currency_id', val || undefined); }
  setDateFrom(val: string)        { this.list.setFilter('date_from',   val || undefined); }
  setDateTo(val: string)          { this.list.setFilter('date_to',     val || undefined); }

  typeLabel(type: TransactionType): string {
    const map: Record<string, string> = {
      sale: 'مبيعات', refund: 'مرتجع',
      admin_deposit: 'إيداع (أدمن)', admin_withdrawal: 'سحب (أدمن)',
      manager_deposit: 'إيداع (مدير)', manager_expense: 'مصروف (مدير)',
      transfer_in: 'تحويل وارد', transfer_out: 'تحويل صادر',
    };
    return map[type] ?? type;
  }

  typeBadgeClass(type: TransactionType): string {
    const inTypes = ['sale', 'admin_deposit', 'manager_deposit', 'transfer_in'];
    return inTypes.includes(type)
      ? 'bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400'
      : 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400';
  }
}
