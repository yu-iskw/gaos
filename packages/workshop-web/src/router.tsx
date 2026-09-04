import {
  Navigate,
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from '@tanstack/react-router';

import { useOptionalAuth } from './AuthContext';
import AppShell from './components/AppShell/AppShell';
import LoginPage from './LoginPage';
import {
  AdminPage,
  ContextPage,
  ProfilePage,
  ProvidersPage,
  SchedulesPanel,
} from './pages/AccountPages';
import {
  BlueprintDetailPage,
  BlueprintsPage,
  ExplorePage,
  GatekeeperAppPage,
  OutputsPage,
} from './pages/ComingSoonPages';
import ConnectorsPage from './pages/ConnectorsPage';
import HomePage from './pages/HomePage';
import WorkspacesPage from './pages/WorkspacesPage';
import SignupPage from './SignupPage';
import WorkspaceEditor from './WorkspaceEditor';

function chatFromSearch(value: unknown, fallback: string): string {
  if (typeof value !== 'object' || value === null || !('chat' in value)) {
    return fallback;
  }
  return typeof value.chat === 'string' ? value.chat : fallback;
}

function AdminWithSchedules() {
  return (
    <div>
      <AdminPage />
      <div className="mx-auto max-w-lg px-6 pb-8">
        <SchedulesPanel />
      </div>
    </div>
  );
}

export function createWorkshopRouter(options: {
  onAuthed: (token: string, chatId: string) => Promise<void>;
}) {
  const rootRoute = createRootRoute({
    component: function Root() {
      return <Outlet />;
    },
  });

  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: function Index() {
      const session = useOptionalAuth();
      if (session === null) {
        return <LoginPage onAuthed={options.onAuthed} />;
      }
      return (
        <AppShell>
          <HomePage />
        </AppShell>
      );
    },
  });

  const signupRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/signup',
    component: function Signup() {
      return <SignupPage onAuthed={options.onAuthed} />;
    },
  });

  function authedShell(Page: () => React.JSX.Element) {
    return function Wrapped() {
      const session = useOptionalAuth();
      if (session === null) {
        return <Navigate to="/" />;
      }
      return (
        <AppShell>
          <Page />
        </AppShell>
      );
    };
  }

  const workspacesRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/workspaces',
    component: authedShell(WorkspacesPage),
  });
  const blueprintsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/blueprints',
    component: authedShell(BlueprintsPage),
  });
  const blueprintRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/blueprint/$id',
    component: authedShell(BlueprintDetailPage),
  });
  const outputsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/outputs',
    component: authedShell(OutputsPage),
  });
  const exploreRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/explore',
    component: authedShell(ExplorePage),
  });
  const gatekeepersRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/gatekeepers',
    component: authedShell(ConnectorsPage),
  });
  const gatekeeperAppRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/gatekeepers/$appId',
    component: authedShell(GatekeeperAppPage),
  });
  const contextRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/context',
    component: authedShell(ContextPage),
  });
  const profileRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/profile',
    component: authedShell(ProfilePage),
  });
  const providersRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/providers',
    component: authedShell(ProvidersPage),
  });
  const adminRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/admin',
    component: authedShell(AdminWithSchedules),
  });
  const workspaceRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/workspace/$id',
    validateSearch: (search: Record<string, unknown>): { chat?: string } => ({
      chat: typeof search['chat'] === 'string' ? search['chat'] : undefined,
    }),
    component: function Workspace() {
      const session = useOptionalAuth();
      if (session === null) {
        return <Navigate to="/" />;
      }
      return (
        <WorkspaceEditor
          chatId={chatFromSearch(workspaceRoute.useSearch() as unknown, session.chatId)}
        />
      );
    },
  });
  const gadgetRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/gadget/$id',
    beforeLoad: () => redirect({ to: '/workspace/$id', params: { id: 'me' } }),
    component: function GadgetRedirect() {
      return null;
    },
  });

  const routeTree = rootRoute.addChildren([
    indexRoute,
    signupRoute,
    workspacesRoute,
    blueprintsRoute,
    blueprintRoute,
    outputsRoute,
    exploreRoute,
    gatekeepersRoute,
    gatekeeperAppRoute,
    contextRoute,
    profileRoute,
    providersRoute,
    adminRoute,
    workspaceRoute,
    gadgetRoute,
  ]);

  return createRouter({ routeTree });
}
