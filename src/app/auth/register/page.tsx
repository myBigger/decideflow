import { redirect } from 'next/navigation'
import { getSession } from '@/app/actions/auth'
import RegisterForm from './RegisterForm'

// If already authenticated, redirect to dashboard
export default async function RegisterPage() {
  const session = await getSession()
  if (session.authenticated) {
    redirect('/dashboard')
  }

  return <RegisterForm />
}
