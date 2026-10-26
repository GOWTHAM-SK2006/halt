import { redirect } from 'next/navigation';

export default async function Home() {
  // In demo mode, redirect to the demo payment session.
  // NEXT_PUBLIC_DEMO_MODE is baked in at build time for the client,
  // but is available server-side via process.env as well.
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
    redirect('/pay/demo-token-abc123');
  }
  // In production, visiting root without a token is invalid.
  redirect('/pay/invalid');
}
