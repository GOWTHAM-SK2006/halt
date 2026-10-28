import { redirect } from 'next/navigation';

// Root always opens the admin login — no more /pay/invalid for customers
export default function Home() {
  redirect('/admin/login');
}
