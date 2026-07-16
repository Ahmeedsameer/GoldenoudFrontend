import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HrService } from '../../services/hr.service';
import { LoadingComponent } from '../../loading/loading.component';

@Component({
  selector: 'app-my-sales',
  imports: [CommonModule, LoadingComponent],
  templateUrl: './my-sales.component.html',
})
export class MySalesComponent implements OnInit {
  private hr = inject(HrService);

  loading = false;
  data: any = null;

  year = new Date().getFullYear();
  month = new Date().getMonth() + 1;
  monthNames = ['', 'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

  ngOnInit(): void { this.load(); }

  load() {
    this.loading = true;
    this.hr.mySales({ year: this.year, month: this.month }).subscribe({
      next: (d) => { this.data = d; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  prevMonth() { this.month--; if (this.month < 1) { this.month = 12; this.year--; } this.load(); }
  nextMonth() { this.month++; if (this.month > 12) { this.month = 1; this.year++; } this.load(); }
}
