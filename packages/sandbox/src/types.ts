export type RunResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
};

export type SpawnHandle = {
  id: string;
  wait: () => Promise<RunResult>;
};

export type Sandbox = {
  /** Cloud Run sandbox name, or Docker container id. */
  id: string;
  destroy: () => Promise<void>;
  readFile: (path: string) => Promise<string>;
  /** Host→sandbox exec (`sandbox exec` / dockerode exec). */
  run: (command: string[]) => Promise<RunResult>;
  spawn: (command: string[]) => Promise<SpawnHandle>;
  writeFile: (path: string, content: string) => Promise<void>;
};

export type BindMount = {
  hostPath: string;
  sandboxPath: string;
};

export type CreateSandboxOptions = {
  binds?: BindMount[];
  /** Explicit env only. Never inherited from the host process. */
  env?: Record<string, string>;
  image?: string;
};
