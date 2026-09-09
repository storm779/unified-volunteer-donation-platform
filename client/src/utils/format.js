export const money = (value = 0) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
export const compactMoney = (value = 0) =>
  value >= 100000 ? `₹${(value / 100000).toFixed(1).replace(/\.0$/, '')}L` : money(value);
export const date = (value) =>
  value
    ? new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(
        new Date(value),
      )
    : '—';
export const initials = (name = '') =>
  name
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
export const progress = (campaign) =>
  Math.min(100, Math.round((campaign.raised / campaign.target) * 100));
