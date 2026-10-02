/// <reference types="vite/client" />

declare module 'virtual:project-file-manifest' {
  const manifest: import('@/types/projectFiles').ProjectManifest;
  export default manifest;
}

declare module 'virtual:recovered-aqua-init' {
  const init: void;
  export default init;
}