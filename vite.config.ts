import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react-swc';
import { viteSingleFile } from 'vite-plugin-singlefile';
/** IMPORTANT: DO NOT REMOVE THIS LINE */
import { aippyTaggerPlugin, aippyPreloadPlugin, assetConstantsPlugin } from '@aippy/vite-plugins';
import { aippySourceImportPlugin } from './vite-plugin-aippy-source-import';
import { projectFileManifestPlugin } from './vite-plugin-project-manifest';

export default defineConfig(({ mode }) => ({
  server: {
    host: '::',
    port: 8080
  },
  plugins: [
    // Build-time Aippy source import must be registered first
    aippySourceImportPlugin(),
    projectFileManifestPlugin(),
    react(),
    tailwindcss(),
    // Development only: asset constants plugin
    mode === 'development' && assetConstantsPlugin({
      extensions: ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.mp4', '.mp3', '.wav', '.ogg', '.webm'],
      srcDir: 'src',
      outputFile: 'src/config/assets.json',
      devMode: true
    }),
    // Development only: component tagging for inspector
    mode === 'development' && aippyTaggerPlugin(),
    // bundle optimization
    viteSingleFile({
      useRecommendedBuildConfig: true,
      removeViteModuleLoader: true,
      deleteInlinedFiles: true
    }),
    // asset preload for aippy app (scans source files)
    aippyPreloadPlugin({
      extensions: ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.woff', '.woff2', '.ttf', '.eot', '.mp4', '.mp3', '.wav', '.ogg', '.webm', '.task', '.tflite'],
      srcDir: 'src',
      outDir: 'dist',
      deepScan: true
    }),
    // Remove inspector script in production
    mode === 'production' && {
      name: 'remove-inspector-script',
      transformIndexHtml(html: string) {
        return html.replace(
          /<!-- Inspector script for iframe editing mode -->[\s\S]*?<!-- Inspector script end -->/,
          ''
        );
      },
    },
  ].filter(Boolean),
  build: {
    sourcemap: mode === 'development',
    minify: mode === 'production',
  },
}));