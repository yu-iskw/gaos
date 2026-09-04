import { Banner, Button, Input } from '@cloudflare/kumo';
import { Hexagon } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';

import SiteLogo from './components/SiteLogo';
import { useRpcStub } from './RpcContext';

export default function SignupPage({
  onAuthed,
}: {
  onAuthed: (token: string, chatId: string) => Promise<void>;
}) {
  const rpc = useRpcStub();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  return (
    <section className="relative flex h-full items-center justify-center bg-kumo-base px-4">
      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <SiteLogo
            size={40}
            className="mb-3 flex items-center justify-center rounded-xl bg-kumo-brand text-white"
          >
            <Hexagon size={22} weight="bold" />
          </SiteLogo>
          <h1 className="text-xl font-semibold">gaos</h1>
          <p className="mt-1 text-sm text-kumo-subtle">Create your account</p>
        </div>
        <form
          className="flex flex-col gap-3"
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            void (async () => {
              setError(null);
              try {
                const authed = rpc.signup(email, password);
                await onAuthed(await authed.token(), await authed.chatId());
              } catch (caught) {
                setError(caught instanceof Error ? caught.message : 'Could not sign up');
              }
            })();
          }}
        >
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
          {error ? <Banner variant="error">{error}</Banner> : null}
          <Button type="submit" variant="primary">
            Sign up
          </Button>
        </form>
        <p className="mt-4 text-center text-sm">
          <Link to="/" className="text-kumo-brand">
            Sign in
          </Link>
        </p>
      </div>
    </section>
  );
}
