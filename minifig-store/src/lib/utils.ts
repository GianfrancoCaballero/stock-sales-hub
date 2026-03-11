export function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(' ');
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
  }).format(value);
}

export function formatWhatsAppMessage(
  items: { name: string; quantity: number; price: number }[],
  customerName?: string
): string {
  const whatsappNumber = import.meta.env.VITE_WHATSAPP_NUMBER ?? '51949784120';
  const lines = items.map(
    (item) =>
      `• ${item.quantity}x ${item.name} – ${formatCurrency(item.price * item.quantity)}`
  );
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const name = customerName ? `\nNombre: ${customerName}` : '';
  const text = [
    '¡Hola! Me gustaría hacer el siguiente pedido:',
    '',
    ...lines,
    '',
    `*Total: ${formatCurrency(total)}*`,
    name,
  ]
    .join('\n')
    .trim();

  const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(text)}`;
  return url;
}
