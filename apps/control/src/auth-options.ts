import { verifyCredentials } from "@verity/data"
import type { UserRole } from "@verity/domain"
import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET ?? "verity-local-reviewer-secret-change-outside-demo",
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Seeded reviewer account",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null
        return verifyCredentials(credentials.email, credentials.password)
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id
        token.role = user.role as UserRole
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId
        session.user.role = token.role
      }
      return session
    },
  },
}
