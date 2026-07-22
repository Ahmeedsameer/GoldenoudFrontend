/**
 * Groups raw invoice_items rows into customer-facing display lines. Items
 * sold via the catalog "sell a perfume" dialog share a `parent_product_id`
 * and are collapsed into ONE line showing only the catalog product name,
 * the chosen bottle, and the oil weight — cap/spray/box/label and any other
 * fixed component are never shown individually. Normal (non-composed) items
 * are returned unchanged, one display row each, exactly as before.
 */
export interface InvoiceDisplayLine {
  composed: boolean;
  name: string;
  bottleName?: string;
  oilGrams?: number;
  oilUnit?: string;
  quantity: number;
  unit?: string;
  price: number;
  lineTotal: number;
}

/**
 * @param showComposition When false (the customer-facing printed receipt),
 * the bottle/oil breakdown is stripped from composed lines — only the
 * perfume name, quantity and final price remain. Admins/Branch Managers pass
 * true to see the internal composition for auditing; regular sellers and the
 * printed receipt must always pass false.
 */
export function buildInvoiceDisplayLines(items: any[], showComposition = true): InvoiceDisplayLine[] {
  const plain: any[] = [];
  const groups = new Map<number, any[]>();

  for (const item of items ?? []) {
    if (item.parent_product_id) {
      const list = groups.get(item.parent_product_id) ?? [];
      list.push(item);
      groups.set(item.parent_product_id, list);
    } else {
      plain.push(item);
    }
  }

  const lines: InvoiceDisplayLine[] = plain.map((item) => ({
    composed: false,
    name: item.product?.name ?? '',
    quantity: +item.quantity,
    unit: item.product?.scalar,
    price: +item.price,
    lineTotal: +item.quantity * +item.price,
  }));

  for (const [, groupItems] of groups) {
    const bottle = groupItems.find((i) => i.role === 'bottle');
    const oil = groupItems.find((i) => i.role === 'oil');
    const parentName = groupItems[0]?.parent_product?.name ?? groupItems[0]?.parentProduct?.name ?? '—';
    const total = groupItems.reduce((s, i) => s + (+i.quantity * +i.price), 0);

    lines.push({
      composed: true,
      name: parentName,
      bottleName: showComposition ? bottle?.product?.name : undefined,
      oilGrams: showComposition && oil ? +oil.quantity : undefined,
      oilUnit: oil?.product?.scalar ?? 'g',
      quantity: 1,
      price: total,
      lineTotal: total,
    });
  }

  return lines;
}
