import type { Service } from './types';

export const SERVICES: Service[] = [
  {
    id: 'supermarket',
    emoji: '🛒',
    labelKey: 'services.supermarket',
    descKey: 'services.supermarket_desc',
    base: 8,
    type: 'flat',
    needsPickup: true,
  },
  {
    id: 'meds',
    emoji: '💊',
    labelKey: 'services.meds',
    descKey: 'services.meds_desc',
    base: 6,
    type: 'flat',
    needsPickup: true,
  },
  {
    id: 'food',
    emoji: '🍕',
    labelKey: 'services.food',
    descKey: 'services.food_desc',
    base: 5,
    type: 'flat',
    needsPickup: true,
  },
  {
    id: 'keys',
    emoji: '🗝️',
    labelKey: 'services.keys',
    descKey: 'services.keys_desc',
    base: 6,
    type: 'flat',
    needsPickup: true,
  },
  {
    id: 'shopping',
    emoji: '🛍️',
    labelKey: 'services.shopping',
    descKey: 'services.shopping_desc',
    base: 8,
    type: 'flat',
    needsPickup: true,
  },
  {
    id: 'voiturier',
    emoji: '🚗',
    labelKey: 'services.voiturier',
    descKey: 'services.voiturier_desc',
    base: 25,
    type: 'hour',
    needsPickup: false,
  },
  {
    id: 'it',
    emoji: '💻',
    labelKey: 'services.it',
    descKey: 'services.it_desc',
    base: 65,
    type: 'hour',
    needsPickup: false,
  },
  {
    id: 'assist',
    emoji: '🤝',
    labelKey: 'services.assist',
    descKey: 'services.assist_desc',
    base: 25,
    type: 'hour',
    needsPickup: false,
  },
  {
    id: 'bricolage',
    emoji: '🔧',
    labelKey: 'services.bricolage',
    descKey: 'services.bricolage_desc',
    base: 60,
    type: 'hour',
    needsPickup: false,
  },
];

export function getService(id: string) {
  return SERVICES.find((s) => s.id === id) ?? null;
}

export function calcPrice(serviceId: string, km: number, hours: number): number {
  const s = getService(serviceId);
  if (!s) return 0;
  if (s.type === 'hour') {
    return Math.round(s.base * Math.max(1, hours) * 100) / 100;
  }
  return Math.round((s.base + km * 1) * 100) / 100;
}
