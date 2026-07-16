import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AppHeaderComponent } from '../header/header.component';
import { BackdropComponent } from '../backdrop/backdrop.component';
import { SidebarService } from '../shared/services/sidebar.service';
import { NavItem, SideBarComponent } from '../side-bar/side-bar.component';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-seller-dashboard-layout',
  imports: [
    CommonModule,
    RouterModule,
    AppHeaderComponent,
    SideBarComponent,
    BackdropComponent,
  ],
  templateUrl: './seller-dashboard-layout.component.html',
  styleUrl: './seller-dashboard-layout.component.css',
})
export class SellerDashboardLayoutComponent {
  navItems: NavItem[] = [
    {
      icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" fill="currentColor"><path d="M0 488C0 501.3 10.7 512 24 512L56 512C56 547.3 84.7 576 120 576C155.3 576 184 547.3 184 512L296 512C296 547.3 324.7 576 360 576C395.3 576 424 547.3 424 512L448 512C465.7 512 480 497.7 480 480L480 328L389.5 192L288 192L288 64L24 64C10.7 64 0 74.7 0 88L0 488zM360 536C346.7 536 336 525.3 336 512C336 498.7 346.7 488 360 488C373.3 488 384 498.7 384 512C384 525.3 373.3 536 360 536zM120 488C133.3 488 144 498.7 144 512C144 525.3 133.3 536 120 536C106.7 536 96 525.3 96 512C96 498.7 106.7 488 120 488zM288 224L379.5 224L448 326.9L448 360L288 360L288 224zM528 192C501.5 192 480 213.5 480 240C480 266.5 501.5 288 528 288C554.5 288 576 266.5 576 240C576 213.5 554.5 192 528 192zM512 448C512 430.3 526.3 416 544 416C561.7 416 576 430.3 576 448C576 465.7 561.7 480 544 480C526.3 480 512 465.7 512 448z"/></svg>`,
      name: 'الكاشير',
      subItems: [
        { name: 'فاتورة جديدة', path: '/dashboard/cashier' },
      ],
    },
    {
      icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" fill="currentColor"><path d="M112 0C85.5 0 64 21.5 64 48L64 96L48 96C21.5 96 0 117.5 0 144L0 576C0 602.5 21.5 624 48 624L464 624C490.5 624 512 602.5 512 576L512 144C512 117.5 490.5 96 464 96L448 96L448 48C448 21.5 426.5 0 400 0L368 0C341.5 0 320 21.5 320 48L320 96L192 96L192 48C192 21.5 170.5 0 144 0L112 0zM112 96L144 96L144 192L368 192L368 96L400 96L400 192L464 192L464 576L48 576L48 192L112 192L112 96zM104 272C90.7 272 80 282.7 80 296C80 309.3 90.7 320 104 320L408 320C421.3 320 432 309.3 432 296C432 282.7 421.3 272 408 272L104 272zM80 408C80 421.3 90.7 432 104 432L408 432C421.3 432 432 421.3 432 408C432 394.7 421.3 384 408 384L104 384C90.7 384 80 394.7 80 408zM104 496C90.7 496 80 506.7 80 520C80 533.3 90.7 544 104 544L248 544C261.3 544 272 533.3 272 520C272 506.7 261.3 496 248 496L104 496z"/></svg>`,
      name: 'فواتيري',
      subItems: [
        { name: 'عرض الفواتير', path: '/dashboard/invoices' },
      ],
    },
    {
      icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" fill="currentColor"><path d="M320 312C386.3 312 440 258.3 440 192C440 125.7 386.3 72 320 72C253.7 72 200 125.7 200 192C200 258.3 253.7 312 320 312zM290.3 368C191.8 368 112 447.8 112 546.3C112 562.7 125.3 576 141.7 576L498.3 576C514.7 576 528 562.7 528 546.3C528 447.8 448.2 368 349.7 368L290.3 368z"/></svg>`,
      name: 'ملفّي الوظيفي',
      subItems: [
        { name: 'نظرة عامة', path: '/dashboard/my-hr' },
        { name: 'ملفي الشخصي', path: '/dashboard/my-profile' },
        { name: 'جدولي الأسبوعي', path: '/dashboard/my-schedule' },
        { name: 'حضوري', path: '/dashboard/my-attendance' },
        { name: 'إجازاتي', path: '/dashboard/my-leave' },
        { name: 'مبيعاتي', path: '/dashboard/my-sales' },
        { name: 'سلفتي', path: '/dashboard/my-advances' },
      ],
    },
  ];

  readonly isExpanded$;
  readonly isHovered$;
  readonly isMobileOpen$;

  private authService = inject(AuthService);

  constructor(public sidebarService: SidebarService) {
    this.isExpanded$ = this.sidebarService.isExpanded$;
    this.isHovered$ = this.sidebarService.isHovered$;
    this.isMobileOpen$ = this.sidebarService.isMobileOpen$;
  }

  logOut() {
    this.authService.logout();
  }
}
