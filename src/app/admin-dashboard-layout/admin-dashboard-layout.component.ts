import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AppHeaderComponent } from '../header/header.component';

import { BackdropComponent } from '../backdrop/backdrop.component';
import { SidebarService } from '../shared/services/sidebar.service';
import { NavItem, SideBarComponent } from '../side-bar/side-bar.component';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-admin-dashboard-layout',
  imports: [  
      CommonModule,
    RouterModule,
    AppHeaderComponent,
    SideBarComponent,
    BackdropComponent],
  templateUrl: './admin-dashboard-layout.component.html',
  styleUrl: './admin-dashboard-layout.component.css',
})
export class AdminDashboardLayoutComponent {

  navItems: NavItem[] = [
    {
      icon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M5.5 3.25C4.25736 3.25 3.25 4.25736 3.25 5.5V8.99998C3.25 10.2426 4.25736 11.25 5.5 11.25H9C10.2426 11.25 11.25 10.2426 11.25 8.99998V5.5C11.25 4.25736 10.2426 3.25 9 3.25H5.5ZM4.75 5.5C4.75 5.08579 5.08579 4.75 5.5 4.75H9C9.41421 4.75 9.75 5.08579 9.75 5.5V8.99998C9.75 9.41419 9.41421 9.74998 9 9.74998H5.5C5.08579 9.74998 4.75 9.41419 4.75 8.99998V5.5ZM5.5 12.75C4.25736 12.75 3.25 13.7574 3.25 15V18.5C3.25 19.7426 4.25736 20.75 5.5 20.75H9C10.2426 20.75 11.25 19.7427 11.25 18.5V15C11.25 13.7574 10.2426 12.75 9 12.75H5.5ZM4.75 15C4.75 14.5858 5.08579 14.25 5.5 14.25H9C9.41421 14.25 9.75 14.5858 9.75 15V18.5C9.75 18.9142 9.41421 19.25 9 19.25H5.5C5.08579 19.25 4.75 18.9142 4.75 18.5V15ZM12.75 5.5C12.75 4.25736 13.7574 3.25 15 3.25H18.5C19.7426 3.25 20.75 4.25736 20.75 5.5V8.99998C20.75 10.2426 19.7426 11.25 18.5 11.25H15C13.7574 11.25 12.75 10.2426 12.75 8.99998V5.5ZM15 4.75C14.5858 4.75 14.25 5.08579 14.25 5.5V8.99998C14.25 9.41419 14.5858 9.74998 15 9.74998H18.5C18.9142 9.74998 19.25 9.41419 19.25 8.99998V5.5C19.25 5.08579 18.9142 4.75 18.5 4.75H15ZM15 12.75C13.7574 12.75 12.75 13.7574 12.75 15V18.5C12.75 19.7426 13.7574 20.75 15 20.75H18.5C19.7426 20.75 20.75 19.7427 20.75 18.5V15C20.75 13.7574 19.7426 12.75 18.5 12.75H15ZM14.25 15C14.25 14.5858 14.5858 14.25 15 14.25H18.5C18.9142 14.25 19.25 14.5858 19.25 15V18.5C19.25 18.9142 18.9142 19.25 18.5 19.25H15C14.5858 19.25 14.25 18.9142 14.25 18.5V15Z" fill="currentColor"></path></svg>`,
    //  icon:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><!--!Font Awesome Free v7.2.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2026 Fonticons, Inc.--><path d="M64 320C64 178.6 178.6 64 320 64C461.4 64 576 178.6 576 320C576 461.4 461.4 576 320 576C178.6 576 64 461.4 64 320zM384 416C384 389.1 367.5 366.1 344 356.7L344 184C344 170.7 333.3 160 320 160C306.7 160 296 170.7 296 184L296 356.7C272.5 366.2 256 389.2 256 416C256 451.3 284.7 480 320 480C355.3 480 384 451.3 384 416zM208 240C225.7 240 240 225.7 240 208C240 190.3 225.7 176 208 176C190.3 176 176 190.3 176 208C176 225.7 190.3 240 208 240zM192 320C192 302.3 177.7 288 160 288C142.3 288 128 302.3 128 320C128 337.7 142.3 352 160 352C177.7 352 192 337.7 192 320zM480 352C497.7 352 512 337.7 512 320C512 302.3 497.7 288 480 288C462.3 288 448 302.3 448 320C448 337.7 462.3 352 480 352zM464 208C464 190.3 449.7 176 432 176C414.3 176 400 190.3 400 208C400 225.7 414.3 240 432 240C449.7 240 464 225.7 464 208z"/></svg>`,
      name: "Dashboard",
      subItems: [
        { name: "Ecommerce", path: "/" },
      ],
    },
    {
      icon:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><!--!Font Awesome Free v7.2.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2026 Fonticons, Inc.--><path d="M320 80C377.4 80 424 126.6 424 184C424 241.4 377.4 288 320 288C262.6 288 216 241.4 216 184C216 126.6 262.6 80 320 80zM96 152C135.8 152 168 184.2 168 224C168 263.8 135.8 296 96 296C56.2 296 24 263.8 24 224C24 184.2 56.2 152 96 152zM0 480C0 409.3 57.3 352 128 352C140.8 352 153.2 353.9 164.9 357.4C132 394.2 112 442.8 112 496L112 512C112 523.4 114.4 534.2 118.7 544L32 544C14.3 544 0 529.7 0 512L0 480zM521.3 544C525.6 534.2 528 523.4 528 512L528 496C528 442.8 508 394.2 475.1 357.4C486.8 353.9 499.2 352 512 352C582.7 352 640 409.3 640 480L640 512C640 529.7 625.7 544 608 544L521.3 544zM472 224C472 184.2 504.2 152 544 152C583.8 152 616 184.2 616 224C616 263.8 583.8 296 544 296C504.2 296 472 263.8 472 224zM160 496C160 407.6 231.6 336 320 336C408.4 336 480 407.6 480 496L480 512C480 529.7 465.7 544 448 544L192 544C174.3 544 160 529.7 160 512L160 496z"/></svg>`,
      name: "ادارة المستخدمين",
      subItems: [
        { name: "تصفح المستخدمين", path: "/dashboard/users/" },
        { name: "اضافة مستخدم", path: "/dashboard/users/create" },
      ],
    },
    {
      icon:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><!--!Font Awesome Free v7.2.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2026 Fonticons, Inc.--><path d="M320 64C326.6 64 332.9 66.7 337.4 71.5L481.4 223.5L481.9 224L560 224C577.7 224 592 238.3 592 256C592 270.5 582.4 282.7 569.2 286.7L523.1 493.9C516.6 523.2 490.6 544 460.6 544L179.3 544C149.3 544 123.3 523.2 116.8 493.9L70.8 286.7C57.6 282.8 48 270.5 48 256C48 238.3 62.3 224 80 224L158.1 224L158.6 223.5L302.6 71.5C307.1 66.7 313.4 64 320 64zM320 122.9L224.2 224L415.8 224L320 122.9zM240 328C240 314.7 229.3 304 216 304C202.7 304 192 314.7 192 328L192 440C192 453.3 202.7 464 216 464C229.3 464 240 453.3 240 440L240 328zM320 304C306.7 304 296 314.7 296 328L296 440C296 453.3 306.7 464 320 464C333.3 464 344 453.3 344 440L344 328C344 314.7 333.3 304 320 304zM448 328C448 314.7 437.3 304 424 304C410.7 304 400 314.7 400 328L400 440C400 453.3 410.7 464 424 464C437.3 464 448 453.3 448 440L448 328z"/></svg>`,
      name: "ادارة المنتجات",
      subItems: [
        { name: "الفئات", path: "/dashboard/products/categories" },
        { name: "المنتجات", path: "/dashboard/products" },

      ],
    },
    {
      icon:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" fill="currentColor"><path d="M128 64C92.7 64 64 92.7 64 128L64 512C64 547.3 92.7 576 128 576L448 576C483.3 576 512 547.3 512 512L512 128C512 92.7 483.3 64 448 64L128 64zM160 176C160 167.2 167.2 160 176 160L400 160C408.8 160 416 167.2 416 176C416 184.8 408.8 192 400 192L176 192C167.2 192 160 184.8 160 176zM160 272C160 263.2 167.2 256 176 256L400 256C408.8 256 416 263.2 416 272C416 280.8 408.8 288 400 288L176 288C167.2 288 160 280.8 160 272zM160 368C160 359.2 167.2 352 176 352L288 352C296.8 352 304 359.2 304 368C304 376.8 296.8 384 288 384L176 384C167.2 384 160 376.8 160 368z"/></svg>`,
      name: "مراجعة الفواتير",
      subItems: [
        { name: "الفواتير المعلّقة", path: "/dashboard/pending-invoices" },
      ],
    },
    {
      icon:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><!--!Font Awesome Free v7.2.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2026 Fonticons, Inc.--><path d="M53.5 245.1L110.3 131.4C121.2 109.7 143.3 96 167.6 96L472.5 96C496.7 96 518.9 109.7 529.7 131.4L586.5 245.1C590.1 252.3 592 260.2 592 268.3C592 295.6 570.8 318 544 319.9L544 512C544 529.7 529.7 544 512 544C494.3 544 480 529.7 480 512L480 320L384 320L384 496C384 522.5 362.5 544 336 544L144 544C117.5 544 96 522.5 96 496L96 319.9C69.2 318 48 295.6 48 268.3C48 260.3 49.9 252.3 53.5 245.1zM160 320L160 432C160 440.8 167.2 448 176 448L304 448C312.8 448 320 440.8 320 432L320 320L160 320z"/></svg>`,
      name: "ادارة الفروع",
      path:"/dashboard/shops"
    },

    {
      icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" fill="currentColor"><path d="M0 488C0 501.3 10.7 512 24 512L56 512C56 547.3 84.7 576 120 576C155.3 576 184 547.3 184 512L296 512C296 547.3 324.7 576 360 576C395.3 576 424 547.3 424 512L448 512C465.7 512 480 497.7 480 480L480 328L389.5 192L288 192L288 64L24 64C10.7 64 0 74.7 0 88L0 488zM360 536C346.7 536 336 525.3 336 512C336 498.7 346.7 488 360 488C373.3 488 384 498.7 384 512C384 525.3 373.3 536 360 536zM120 488C133.3 488 144 498.7 144 512C144 525.3 133.3 536 120 536C106.7 536 96 525.3 96 512C96 498.7 106.7 488 120 488zM288 224L379.5 224L448 326.9L448 360L288 360L288 224zM528 192C501.5 192 480 213.5 480 240C480 266.5 501.5 288 528 288C554.5 288 576 266.5 576 240C576 213.5 554.5 192 528 192zM512 448C512 430.3 526.3 416 544 416C561.7 416 576 430.3 576 448C576 465.7 561.7 480 544 480C526.3 480 512 465.7 512 448z"/></svg>`,
      name: "المخزون",
      subItems: [
        { name: "المخزون والتوريدات", path: "/dashboard/stock" },
      ],
    },

    {
      icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M7 16l4-4 4 4 4-4"/></svg>`,
      name: "التقارير",
      subItems: [
        { name: "تقارير المبيعات",  path: "/dashboard/reports/sales" },
        { name: "التقرير المالي",   path: "/dashboard/reports/financial" },
        { name: "ذكاء المخزون",     path: "/dashboard/stock-intelligence" },
      ],
    },

    {
      icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>`,
      name: "إدارة الخزنة",
      subItems: [
        { name: "الخزن",             path: "/dashboard/safe/management" },
        { name: "العملات",            path: "/dashboard/currencies" },
        { name: "أنواع الخزن",        path: "/dashboard/safe-types" },
        { name: "أسباب المعاملات",    path: "/dashboard/transaction-reasons" },
      ],
    },

    {
      icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m3-6h7a2 2 0 012 2v6a2 2 0 01-2 2h-7a2 2 0 01-2-2v-6a2 2 0 012-2z"/><circle cx="16" cy="14" r="1"/></svg>`,
      name: "إدارة العهد",
      subItems: [
        { name: "كل العهد", path: "/dashboard/conventions" },
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

  get containerClasses() {
    return [
      'flex-1',
      'transition-all',
      'duration-300',
      'ease-in-out',
      (this.isExpanded$ || this.isHovered$) ? 'xl:ml-[290px]' : 'xl:ml-[90px]',
      this.isMobileOpen$ ? 'ml-0' : ''
    ];
  }


  logOut() {
    this.authService.logout();
  }
}
