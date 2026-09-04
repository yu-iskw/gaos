import { expect, test, type Page } from '@playwright/test';

type Wait =
  | { kind: 'role'; role: 'heading' | 'button' | 'textbox' | 'link'; name: string }
  | { kind: 'text'; text: string };

type PageScenario = {
  name: string;
  auth: 'guest' | 'authed';
  path: string;
  act?: (_page: Page) => Promise<void>;
  wait: Wait;
};

const PASSWORD = 'correct-horse';

async function signUp(page: Page): Promise<{ email: string; password: string }> {
  const email = `user-${crypto.randomUUID()}@example.com`;
  await page.getByRole('textbox', { name: 'email' }).fill(email);
  await page.getByRole('textbox', { name: 'password' }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign up' }).click();
  await expect(page.locator('#status')).toHaveText('signed in');
  return { email, password: PASSWORD };
}

async function snapshot(page: Page, name: string): Promise<void> {
  await expect(page).toMatchAriaSnapshot({ name: `${name}.aria.yml` });
}

async function waitFor(page: Page, wait: Wait): Promise<void> {
  switch (wait.kind) {
    case 'role':
      await expect(page.getByRole(wait.role, { name: wait.name })).toBeVisible();
      return;
    case 'text':
      await expect(page.getByText(wait.text).filter({ visible: true }).first()).toBeVisible();
      return;
    default: {
      const _exhaustive: never = wait;
      throw new Error(`unhandled wait ${JSON.stringify(_exhaustive)}`);
    }
  }
}

async function sendFromHome(page: Page): Promise<void> {
  await page.getByRole('textbox', { name: 'message' }).fill('write a gadget');
  await page.getByRole('button', { name: 'Send' }).click();
  await page.waitForURL(/\/workspace\//);
  await expect(page.getByRole('button', { name: 'Accept' })).toBeVisible({ timeout: 60_000 });
}

const SCENARIOS: PageScenario[] = [
  {
    name: 'signup',
    auth: 'guest',
    path: '/',
    wait: { kind: 'role', role: 'heading', name: 'gaos' },
  },
  {
    name: 'signup-page',
    auth: 'guest',
    path: '/signup',
    wait: { kind: 'text', text: 'Create your account' },
  },
  {
    name: 'login-error',
    auth: 'guest',
    path: '/',
    act: async (page) => {
      await page
        .getByRole('textbox', { name: 'email' })
        .fill(`user-${crypto.randomUUID()}@example.com`);
      await page.getByRole('textbox', { name: 'password' }).fill('wrong-password');
      await page.getByRole('button', { name: 'Sign in' }).click();
    },
    wait: { kind: 'text', text: 'invalid credentials' },
  },
  {
    name: 'sign-in-roundtrip',
    auth: 'guest',
    path: '/',
    act: async (page) => {
      const creds = await signUp(page);
      await page.getByRole('button', { name: 'Sign out' }).click();
      await page.getByRole('textbox', { name: 'email' }).fill(creds.email);
      await page.getByRole('textbox', { name: 'password' }).fill(creds.password);
      await page.getByRole('button', { name: 'Sign in' }).click();
      await expect(page.locator('#status')).toHaveText('signed in');
    },
    wait: { kind: 'role', role: 'button', name: 'Send' },
  },
  {
    name: 'signed-in',
    auth: 'authed',
    path: '/',
    wait: { kind: 'role', role: 'button', name: 'Send' },
  },
  {
    name: 'workspaces',
    auth: 'authed',
    path: '/workspaces',
    wait: { kind: 'role', role: 'heading', name: 'Workspaces' },
  },
  {
    name: 'blueprints',
    auth: 'authed',
    path: '/blueprints',
    wait: { kind: 'text', text: 'Blueprints are not in this workshop yet.' },
  },
  {
    name: 'blueprint-detail',
    auth: 'authed',
    path: '/blueprint/demo',
    wait: { kind: 'text', text: 'Blueprints are not in this workshop yet.' },
  },
  {
    name: 'outputs',
    auth: 'authed',
    path: '/outputs',
    wait: { kind: 'text', text: 'Outputs are not in this workshop yet.' },
  },
  {
    name: 'explore',
    auth: 'authed',
    path: '/explore',
    wait: { kind: 'text', text: 'Explore is not in this workshop yet.' },
  },
  {
    name: 'connectors',
    auth: 'authed',
    path: '/gatekeepers',
    wait: { kind: 'role', role: 'heading', name: 'Connectors' },
  },
  {
    name: 'connector-app',
    auth: 'authed',
    path: '/gatekeepers/mcp',
    wait: { kind: 'text', text: 'This connector has no management UI yet.' },
  },
  {
    name: 'context',
    auth: 'authed',
    path: '/context',
    wait: { kind: 'role', role: 'heading', name: 'Context' },
  },
  {
    name: 'context-saved',
    auth: 'authed',
    path: '/context',
    act: async (page) => {
      await page.getByPlaceholder('title').fill('note');
      await page.getByPlaceholder('body').fill('hello');
      await page.getByRole('button', { name: 'Save document' }).click();
    },
    wait: { kind: 'text', text: 'note' },
  },
  {
    name: 'profile',
    auth: 'authed',
    path: '/profile',
    act: async (page) => {
      await expect(page.getByText(/@example\.com/)).toBeVisible();
    },
    wait: { kind: 'role', role: 'heading', name: 'Profile' },
  },
  {
    name: 'providers',
    auth: 'authed',
    path: '/providers',
    wait: { kind: 'role', role: 'heading', name: 'Providers' },
  },
  {
    name: 'admin',
    auth: 'authed',
    path: '/admin',
    wait: { kind: 'role', role: 'heading', name: 'Admin' },
  },
  {
    name: 'admin-schedule',
    auth: 'authed',
    path: '/admin',
    act: async (page) => {
      await page.getByRole('button', { name: 'Create schedule' }).click();
    },
    wait: { kind: 'text', text: 'scheduled turn' },
  },
  {
    name: 'command-palette',
    auth: 'authed',
    path: '/',
    act: async (page) => {
      await page.getByRole('button', { name: 'Search' }).click();
    },
    wait: { kind: 'role', role: 'textbox', name: 'Search' },
  },
  {
    name: 'workspace-empty',
    auth: 'authed',
    path: '/workspaces',
    act: async (page) => {
      await page.getByRole('link', { name: 'Chat 1' }).click();
      await expect(page.getByRole('textbox', { name: 'message' })).toBeVisible();
    },
    wait: { kind: 'role', role: 'button', name: 'Send' },
  },
  {
    name: 'workspace-proposal',
    auth: 'authed',
    path: '/',
    act: sendFromHome,
    wait: { kind: 'role', role: 'button', name: 'Accept' },
  },
  {
    name: 'workspace-code',
    auth: 'authed',
    path: '/',
    act: async (page) => {
      await sendFromHome(page);
      await page.getByRole('button', { name: 'Code' }).click();
    },
    wait: { kind: 'role', role: 'button', name: 'client.js' },
  },
  {
    name: 'workspace-connections',
    auth: 'authed',
    path: '/',
    act: async (page) => {
      await sendFromHome(page);
      await page.getByRole('button', { name: 'Connections' }).click();
    },
    wait: { kind: 'role', role: 'heading', name: 'Connectors' },
  },
  {
    name: 'workspace-accepted',
    auth: 'authed',
    path: '/',
    act: async (page) => {
      await sendFromHome(page);
      await page.getByRole('button', { name: 'Accept' }).click();
    },
    wait: { kind: 'text', text: 'accepted' },
  },
  {
    name: 'workspace-reverted',
    auth: 'authed',
    path: '/',
    act: async (page) => {
      await sendFromHome(page);
      await page.getByRole('button', { name: 'Revert' }).click();
    },
    wait: { kind: 'text', text: 'reverted' },
  },
  {
    name: 'connectors-mint',
    auth: 'authed',
    path: '/gatekeepers',
    act: async (page) => {
      await page.getByRole('textbox', { name: 'vendor' }).fill('http');
      await page.getByRole('textbox', { name: 'name' }).fill('demo');
      await page.getByRole('button', { name: 'Mint' }).click();
    },
    wait: { kind: 'text', text: 'http · demo' },
  },
  {
    name: 'gadget-redirect',
    auth: 'authed',
    path: '/gadget/x',
    wait: { kind: 'role', role: 'button', name: 'Send' },
  },
];

for (const scenario of SCENARIOS) {
  test(scenario.name, async ({ page }) => {
    if (scenario.auth === 'authed') {
      await page.goto('/');
      await signUp(page);
    }
    await page.goto(scenario.path);
    await scenario.act?.(page);
    await waitFor(page, scenario.wait);
    await snapshot(page, scenario.name);
  });
}
