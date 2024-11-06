import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'
import prefixer from 'postcss-prefix-selector';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';


export default defineConfig({
  plugins: [solid(), cssInjectedByJsPlugin()],
  css: {
    postcss: {
      plugins: [
        prefixer({ prefix: 'my-ip-info' }),
        tailwindcss,
        autoprefixer,
      ],
    },
  },
  build: {
    outDir: '../dist',
    minify: 'terser',  // or 'esbuild' for fast minification
    terserOptions: {
      compress: {
        // Remove console logs and comments
        drop_console: false,
        drop_debugger: true,
      },
      output: {
        // Remove comments in the final output
        comments: false,
      },
    },
    // Enable Tree shaking
    rollupOptions: {
      treeshake: true,
      input: {
        'my-ip-info': 'src/App.jsx',
        // 'my-ip-widget': 'src/Widget.jsx'
      },
      output: {
        // dir: 'dist',
        // treeShaking: true,
        // manualChunks(id) {
        //   return undefined
        // },
        // manualChunks(id) {
        //   if (id.includes('node_modules')) {
        //     return 'vendor';
        //   }
        // },
        entryFileNames: '[name].js',
        inlineDynamicImports: true,
        // format: 'es'
      }
    },

  },
})
