declare module 'wait-on' {
  interface WaitOnOptions {
    resources: string[];
    timeout?: number;
    interval?: number;
    delay?: number;
    window?: number;
  }

  function waitOn(options: WaitOnOptions): Promise<void>;

  export = waitOn;
}
