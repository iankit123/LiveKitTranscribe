import { build } from 'esbuild';
import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const functionsDir = 'netlify/functions';
const serverFiles = [
  'server/routes.ts',
  'server/storage.ts',
  'shared/schema.ts'
];

// Ensure functions directory exists
if (!existsSync(functionsDir)) {
  mkdirSync(functionsDir, { recursive: true });
}

// Build API functions
async function buildFunctions() {
  try {
    // Build main API handler
    await build({
      entryPoints: ['server/netlify-handler.ts'],
      bundle: true,
      platform: 'node',
      target: 'node18',
      format: 'esm',
      outfile: `${functionsDir}/api.js`,
      external: ['@google/genai', 'livekit-server-sdk'],
      define: {
        'process.env.NODE_ENV': '"production"'
      }
    });

    console.log('✅ Netlify functions built successfully');
  } catch (error) {
    console.error('❌ Error building functions:', error);
    process.exit(1);
  }
}

buildFunctions();