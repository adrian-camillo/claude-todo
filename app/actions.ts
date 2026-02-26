'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const SESSION_COOKIE = 'todo_session'
const SESSION_VALUE = 'authenticated'

export async function login(formData: FormData) {
  const username = formData.get('username') as string
  const password = formData.get('password') as string

  if (
    username === process.env.AUTH_USERNAME &&
    password === process.env.AUTH_PASSWORD
  ) {
    const cookieStore = await cookies()
    cookieStore.set(SESSION_COOKIE, SESSION_VALUE, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8, // 8 horas
      path: '/',
    })
    redirect('/')
  }

  redirect('/login?error=1')
}

export async function logout() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
  redirect('/login')
}
