import { redirect } from 'next/navigation'
import { getSession } from '@/app/actions/auth'
import LoginForm from './LoginForm'

// If already authenticated, redirect to dashboard
export default async function LoginPage() {
  const session = await getSession()
  if (session.authenticated) {
    redirect('/dashboard')
  }

  return <LoginForm />
}
