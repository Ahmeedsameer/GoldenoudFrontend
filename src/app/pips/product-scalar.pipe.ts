import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'productScalar',
})
export class ProductScalarPipe implements PipeTransform {

  transform(value: unknown, ...args: unknown[]): unknown {
    switch (value) {
      case 'kg':
        return 'كيلو جرام';
        break;
      case 'g':
        return 'جرام';
        break;
      case 'l':
        return 'لتر';
        break;
      case 'ml':
        return 'ملليلتر';
        break;
      case 'pcs':
        return 'قطعة';
        break;
    
      default:
        return value;
        break;
    }
  }

}
