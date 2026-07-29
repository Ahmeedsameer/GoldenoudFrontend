import { PaymentMethodBalance, Safe, SafeTransaction } from './safe.model';

/** The payment-method breakdown for one currency within a safe — shared by every
 *  screen that renders `safe.balances` (manager/admin safe views, safe detail). */
export function methodsForCurrency(safe: Safe, currencyId: number): PaymentMethodBalance[] {
  return safe.balances_by_method?.[currencyId]?.methods ?? [];
}

/** The child safe (payment method) name for a Safe History row — prefers the
 *  direct column (new rows), falls back to the legacy indirect InvoicePayment
 *  path (historical rows), then 'يدوي' for manual/untagged rows. */
export function transactionMethodName(tx: SafeTransaction): string {
  return tx.payment_method?.name ?? tx.invoice_payment?.payment_method?.name ?? 'يدوي';
}
