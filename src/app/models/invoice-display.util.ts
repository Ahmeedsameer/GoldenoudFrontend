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
  /** Cost basis (real FIFO batch cost, falling back to product average cost) — report/detail views only, never printed. */
  cost: number;
  /** lineTotal - cost — report/detail views only, never printed. */
  profit: number;
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

  const lines: InvoiceDisplayLine[] = plain.map((item) => {
    const lineTotal = +item.quantity * +item.price;
    const cost = +(item.line_cost ?? 0);
    return {
      composed: false,
      // Frozen at sale time — never the product's current (possibly renamed)
      // name. Falls back to the live relation only for a legacy row sold
      // before this snapshot existed.
      name: item.product_name ?? item.product?.name ?? '',
      quantity: +item.quantity,
      unit: item.product?.scalar,
      price: +item.price,
      lineTotal,
      cost,
      profit: +(lineTotal - cost).toFixed(2),
    };
  });

  for (const [, groupItems] of groups) {
    const bottle = groupItems.find((i) => i.role === 'bottle');
    const oil = groupItems.find((i) => i.role === 'oil');
    // Frozen at sale time — never the catalog product's current (possibly
    // renamed) name. Falls back to the live relation only for a legacy row
    // sold before this snapshot existed.
    const parentName = groupItems[0]?.parent_product_name ?? groupItems[0]?.parent_product?.name ?? groupItems[0]?.parentProduct?.name ?? '—';
    const total = groupItems.reduce((s, i) => s + (+i.quantity * +i.price), 0);
    const cost = groupItems.reduce((s, i) => s + +(i.line_cost ?? 0), 0);
    // The group's quantity is the Bottle line's own quantity (= Manufacturing
    // Quantity — Oil/Alcohol quantities are per-bottle amounts already scaled
    // up, not a unit count). The group's effective unit price is the WHOLE
    // operation's revenue (Oil's real price + Bottle's real/edited price —
    // Alcohol always contributes 0) divided back down per bottle, not just
    // Bottle's own price — Oil keeps its own real configured price and is
    // never folded entirely into Bottle's line. Falls back to the old
    // sum-based figures for any legacy data with no bottle line present.
    const quantity = bottle ? +bottle.quantity : 1;
    const price = bottle && quantity > 0 ? +(total / quantity).toFixed(2) : total;
    const lineTotal = total;

    lines.push({
      composed: true,
      name: parentName,
      bottleName: showComposition ? (bottle?.product_name ?? bottle?.product?.name) : undefined,
      oilGrams: showComposition && oil ? +oil.quantity : undefined,
      oilUnit: oil?.product?.scalar ?? 'g',
      quantity,
      price,
      lineTotal,
      cost,
      profit: +(lineTotal - cost).toFixed(2),
    });
  }

  return lines;
}
