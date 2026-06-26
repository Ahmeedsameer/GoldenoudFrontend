
import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import flatpickr from 'flatpickr';
import { Instance } from 'flatpickr/dist/types/instance';
import { NgApexchartsModule } from 'ng-apexcharts';

import {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexFill,
  ApexGrid,
  ApexLegend,
  ApexMarkers,
  ApexStroke,
  ApexTooltip,
  ApexXAxis,
  ApexYAxis,
} from 'ng-apexcharts';
@Component({
  selector: 'app-statics-chart',
  imports: [NgApexchartsModule],
  templateUrl: './statics-chart.component.html',
})
export class StatisticsChartComponent implements AfterViewInit {
  @ViewChild('datepicker') datepicker!: ElementRef<HTMLInputElement>;

  ngAfterViewInit() {
    flatpickr(this.datepicker.nativeElement, {
      mode: 'range',
      static: true,
      monthSelectorType: 'static',
      dateFormat: 'M j',
      defaultDate: [new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), new Date()],
      onReady: (selectedDates: Date[], dateStr: string, instance: Instance) => {
        (instance.element as HTMLInputElement).value = dateStr.replace('to', '-');
        const customClass = instance.element.getAttribute('data-class');
        instance.calendarContainer?.classList.add(customClass!);
      },
      onChange: (selectedDates: Date[], dateStr: string, instance: Instance) => {
        (instance.element as HTMLInputElement).value = dateStr.replace('to', '-');
      },
    });
  }
  public series: ApexAxisChartSeries = [
    {
      name: 'Sales',
      data: [180, 190, 170, 160, 175, 165, 170, 205, 230, 210, 240, 235],
    },
    {
      name: 'Revenue',
      data: [40, 30, 50, 40, 55, 40, 70, 100, 110, 120, 150, 140],
    },
  ];

  public chart: ApexChart = {
    fontFamily: 'Inter, system-ui, sans-serif',
    height: 310,
    type: 'area',
    toolbar: { show: false },
  };

  public colors: string[] = ['#D4AF37', '#9A7B1A'];

  public stroke: ApexStroke = {
    curve: 'smooth',
    width: [2.5, 2],
  };

  public fill: ApexFill = {
    type: 'gradient',
    gradient: {
      opacityFrom: 0.35,
      opacityTo: 0,
    },
  };

  public markers: ApexMarkers = {
    size: 0,
    strokeColors: '#FFFFFF',
    strokeWidth: 2,
    hover: { size: 5 },
  };

  public grid: ApexGrid = {
    borderColor: 'rgba(0,0,0,0.07)',
    xaxis: { lines: { show: false } },
    yaxis: { lines: { show: true } },
  };

  public dataLabels: ApexDataLabels = { enabled: false };

  public tooltip: ApexTooltip = {
    enabled: true,
    theme: 'light',
    x: { format: 'dd MMM yyyy' },
  };

  public xaxis: ApexXAxis = {
    type: 'category',
    categories: [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ],
    axisBorder: { show: false },
    axisTicks: { show: false },
    tooltip: { enabled: false },
    labels: {
      style: {
        fontSize: '11px',
        colors: Array(12).fill('#9CA3AF'),
        fontFamily: 'Inter, system-ui, sans-serif',
      },
    },
  };

  public yaxis: ApexYAxis = {
    labels: {
      style: {
        fontSize: '11px',
        colors: ['rgba(255,255,255,0.35)'],
        fontFamily: 'Inter, system-ui, sans-serif',
      },
    },
    title: {
      text: '',
      style: { fontSize: '0px' },
    },
  };

  public legend: ApexLegend = {
    show: true,
    position: 'top',
    horizontalAlign: 'left',
    fontFamily: 'Inter, system-ui, sans-serif',
    labels: { colors: ['#6B7280'] },
  };
}
