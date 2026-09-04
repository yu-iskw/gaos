import { Banner, Button, Input } from '@cloudflare/kumo';
import { Hexagon } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';

import SiteLogo from './components/SiteLogo';
import { useRpcStub } from './RpcContext';

export default function LoginPage({
  onAuthed,
}: {
  onAuthed: (token: string, chatId: string) => Promise<void>;
}) {
  const rpc = useRpcStub();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(kind: 'login' | 'signup'): Promise<void> {
    if (email.length === 0 || password.length === 0 || loading) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const authed = kind === 'signup' ? rpc.signup(email, password) : rpc.login(email, password);
      const token = await authed.token();
      const chatId = await authed.chatId();
      await onAuthed(token, chatId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not sign up');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="relative flex h-full min-h-0 flex-col items-center justify-start overflow-y-auto bg-kumo-base px-4 py-8">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(circle, var(--color-kumo-line) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          maskImage: 'linear-gradient(to bottom, rgb(0 0 0) 0%, rgb(0 0 0 / 0) 70%)',
        }}
      />
      <div className="relative my-auto w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <SiteLogo
            size={40}
            className="mb-3 flex items-center justify-center rounded-xl bg-kumo-brand text-white"
          >
            <Hexagon size={22} weight="bold" />
          </SiteLogo>
          <h1 className="text-xl font-semibold text-kumo-default">gaos</h1>
          <p className="mt-1 text-sm text-kumo-subtle">Sign in to your account</p>
        </div>
        <form
          id="signup-form"
          className="flex flex-col gap-3"
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            void submit('signup');
          }}
        >
          <label className="flex flex-col gap-1">
            <span className="text-[13px] font-medium">Email</span>
            <Input
              aria-label="email"
              type="email"
              placeholder="email"
              value={email}
              required
              onChange={(event) => {
                setEmail(event.target.value);
              }}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[13px] font-medium">Password</span>
            <Input
              aria-label="password"
              type="password"
              placeholder="password"
              value={password}
              required
              onChange={(event) => {
                setPassword(event.target.value);
              }}
            />
          </label>
          {error ? (
            <Banner variant="error">
              <p className="error" id="auth-error">
                {error}
              </p>
            </Banner>
          ) : null}
          <Button type="submit" variant="primary" disabled={loading} className="w-full">
            Sign up
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={loading}
            className="w-full"
            onClick={() => {
              void submit('login');
            }}
          >
            Sign in
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-kumo-subtle">
          Don&apos;t have an account?{' '}
          <Link to="/signup" className="font-medium text-kumo-brand">
            Create one
          </Link>
        </p>
      </div>
    </section>
  );
}
