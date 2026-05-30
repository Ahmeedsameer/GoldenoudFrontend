import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmployeeDashboardLayoutComponent } from './employee-dashboard-layout.component';

describe('EmployeeDashboardLayoutComponent', () => {
  let component: EmployeeDashboardLayoutComponent;
  let fixture: ComponentFixture<EmployeeDashboardLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmployeeDashboardLayoutComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmployeeDashboardLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
