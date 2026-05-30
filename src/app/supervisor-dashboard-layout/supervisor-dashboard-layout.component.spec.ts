import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SupervisorDashboardLayoutComponent } from './supervisor-dashboard-layout.component';

describe('SupervisorDashboardLayoutComponent', () => {
  let component: SupervisorDashboardLayoutComponent;
  let fixture: ComponentFixture<SupervisorDashboardLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SupervisorDashboardLayoutComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SupervisorDashboardLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
