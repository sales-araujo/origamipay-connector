// Minimal typings to keep local TypeScript tooling happy.
// VTEX IO provides React/runtime typings during build.

declare module 'react' {
  export type ReactNode = any
  export type CSSProperties = any

  export class Component<P = any, S = any> {
    constructor(props: P)
    props: P
    state: S
    setState(state: Partial<S> | ((prev: S) => Partial<S>), callback?: () => void): void
    render(): any
  }

  const React: {
    Component: typeof Component
    createElement: any
  }

  export default React
}

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any
  }
}

