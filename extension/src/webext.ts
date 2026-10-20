// The small slice of the WebExtensions API the bridge uses, typed by hand
// (promise style, as in Chrome MV3 `chrome.*` and Firefox `browser.*`).

export interface Event<T extends (...args: never[]) => void> {
  addListener(listener: T): void;
  removeListener(listener: T): void;
}

export interface Port {
  name: string;
  sender?: { url?: string; frameId?: number; tab?: { id?: number } };
  postMessage(message: unknown): void;
  disconnect(): void;
  onMessage: Event<(message: unknown) => void>;
  onDisconnect: Event<() => void>;
}

export interface Permissions {
  origins?: string[];
  permissions?: string[];
}

export interface DnrRule {
  id: number;
  priority?: number;
  action: {
    type: 'modifyHeaders';
    requestHeaders: { header: string; operation: 'set' | 'remove'; value?: string }[];
  };
  condition: {
    urlFilter?: string;
    tabIds?: number[];
    resourceTypes?: string[];
    requestDomains?: string[];
    initiatorDomains?: string[];
  };
}

export interface WebExtApi {
  runtime: {
    id: string;
    connect(info: { name: string }): Port;
    onConnect: Event<(port: Port) => void>;
    getManifest(): { version: string };
    getURL(path: string): string;
    openOptionsPage(): Promise<void>;
  };
  permissions: {
    contains(permissions: Permissions): Promise<boolean>;
    request(permissions: Permissions): Promise<boolean>;
    remove(permissions: Permissions): Promise<boolean>;
    getAll(): Promise<Permissions>;
    onAdded?: Event<(permissions: Permissions) => void>;
    onRemoved?: Event<(permissions: Permissions) => void>;
  };
  declarativeNetRequest?: {
    updateSessionRules(options: { addRules?: DnrRule[]; removeRuleIds?: number[] }): Promise<void>;
    getSessionRules(): Promise<DnrRule[]>;
  };
  tabs: { create(properties: { url: string }): Promise<unknown> };
  action?: { onClicked: Event<() => void> };
  i18n: { getMessage(name: string, substitutions?: string | string[]): string };
}

const scope = globalThis as { browser?: WebExtApi; chrome?: WebExtApi };

/** `browser` in Firefox (and Safari), `chrome` in Chromium. */
export const api: WebExtApi = (scope.browser ?? scope.chrome) as WebExtApi;

/** Good enough to label the bridge ("firefox" also covers Firefox for Android). */
export const engine = /Firefox\//.test(navigator.userAgent)
  ? 'firefox'
  : /Chrome\/|Chromium\//.test(navigator.userAgent)
    ? 'chrome'
    : 'safari';
