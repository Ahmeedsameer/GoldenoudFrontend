import { ProductScalarPipe } from './product-scalar.pipe';

describe('ProductScalarPipe', () => {
  it('create an instance', () => {
    const pipe = new ProductScalarPipe();
    expect(pipe).toBeTruthy();
  });
});
