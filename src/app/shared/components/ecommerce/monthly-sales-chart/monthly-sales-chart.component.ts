
import { Component } from '@angular/core';
import { NgApexchartsModule, ApexAxisChartSeries, ApexChart, ApexXAxis, ApexPlotOptions, ApexDataLabels, ApexStroke, ApexLegend, ApexYAxis, ApexGrid, ApexFill, ApexTooltip } from 'ng-apexcharts';

@Component({
  selector: 'app-monthly-sales-chart',
  standalone: true,
  imports: [
    NgApexchartsModule,
],
  templateUrl: './monthly-sales-chart.component.html'
})
export class MonthlySalesChartComponent {
  public series: ApexAxisChartSeries = [
    {
      name: 'Sales',
      data: [168, 385, 201, 298, 187, 195, 291, 110, 215, 390, 280, 112],
    },
  ];
  public chart: ApexChart = {
    fontFamily: 'Inter, system-ui, sans-serif',
    type: 'bar',
    height: 180,
    toolbar: { show: false },
  };
  public xaxis: ApexXAxis = {
    categories: [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ],
    axisBorder: { show: false },
    axisTicks: { show: false },
    labels: { style: { colors: Array(12).fill('#9CA3AF'), fontFamily: 'Inter, system-ui, sans-serif' } },
  };
  public plotOptions: ApexPlotOptions = {
    bar: {
      horizontal: false,
      columnWidth: '38%',
      borderRadius: 5,
      borderRadiusApplication: 'end',
    },
  };
  public dataLabels: ApexDataLabels = { enabled: false };
  public stroke: ApexStroke = {
    show: true,
    width: 4,
    colors: ['transparent'],
  };
  public legend: ApexLegend = {
    show: false,
  };
  public yaxis: ApexYAxis = {
    title: { text: undefined },
    labels: { style: { colors: ['#9CA3AF'], fontFamily: 'Inter, system-ui, sans-serif' } },
  };
  public grid: ApexGrid = {
    borderColor: 'rgba(0,0,0,0.07)',
    yaxis: { lines: { show: true } },
  };
  public fill: ApexFill = { opacity: 1 };
  public tooltip: ApexTooltip = {
    theme: 'light',
    x: { show: false },
    y: { formatter: (val: number) => `${val}` },
  };
  public colors: string[] = ['#D4AF37'];

}
