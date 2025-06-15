/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_P2P_SERVER_URL?: string
  readonly VITE_APP_NAME?: string
  readonly VITE_DEBUG?: string
  readonly DEV: boolean
  readonly PROD: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}