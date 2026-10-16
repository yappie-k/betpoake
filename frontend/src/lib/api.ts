const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export async function fetchFixtures() {
  const res = await fetch(`${API_URL}/fixtures`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load fixtures');
  return res.json();
}

export async function placeBet(token: string, stakeKes: number, legs: Array<{ marketId: string; outcomeName: string }>) {
  const res = await fetch(`${API_URL}/bets/place`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ stakeKes, legs }),
  });
  return res.json();
}

export async function initiateStkDeposit(token: string, phoneNumber: string, amountKes: number) {
  const res = await fetch(`${API_URL}/payments/deposit/stk-push`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ phoneNumber, amountKes }),
  });
  return res.json();
}