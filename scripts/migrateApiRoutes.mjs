// scripts/migrateApiRoutes.mjs
import fs from 'fs';
import path from 'path';

const SRC_API_DIR = 'F:/Office works/hrms/pages/api';
const DEST_APP_API_DIR = 'F:/Office works/hrms_v2/src/app/api';

function getAllFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of list) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      results = results.concat(getAllFiles(fullPath));
    } else if (item.name.endsWith('.js')) {
      results.push(fullPath);
    }
  }
  return results;
}

const files = getAllFiles(SRC_API_DIR);
console.log(`Found ${files.length} API route files.`);

let successCount = 0;

for (const file of files) {
  const relPath = path.relative(SRC_API_DIR, file).replace(/\\/g, '/');
  let routeDir;
  if (relPath.endsWith('/index.js')) {
    routeDir = path.dirname(relPath);
  } else {
    routeDir = relPath.replace(/\.js$/, '');
  }

  // Skip manually created custom routes
  if (relPath === 'files/[...path].js' || relPath === 'uploads/[...path].js' || relPath === 'notifications/stream.js') {
    continue;
  }

  const targetDir = path.join(DEST_APP_API_DIR, routeDir);
  const targetFile = path.join(targetDir, 'route.ts');

  fs.mkdirSync(targetDir, { recursive: true });

  let content = fs.readFileSync(file, 'utf8');

  // Accurately remove legacy config blocks
  content = content.replace(/export\s+const\s+config\s*=\s*\{[\s\S]*?\n\};?/g, '// Legacy config removed for App Router\n');

  // Check how export default is formatted
  let convertedContent = '';

  // Case 1: export default withSessionTimeout(...) or withPermission(...)
  if (/export\s+default\s+(withSessionTimeout|withPermission|withRoleProtection)/.test(content)) {
    convertedContent = `import { createRouteHandler } from "@/lib/apiAdapter";\n` +
      content.replace(
        /export\s+default\s+([^\n;]+);?/g,
        'const wrappedHandler = $1;\nexport const { GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS } = createRouteHandler(wrappedHandler);'
      );
  }
  // Case 2: export default async function handler / export default function handler / export default async function ...
  else if (/export\s+default\s+async\s+function\s*(\w*)\s*\(/.test(content)) {
    const fnNameMatch = content.match(/export\s+default\s+async\s+function\s*(\w*)\s*\(/);
    const fnName = fnNameMatch[1] || 'handler';
    convertedContent = `import { createRouteHandler } from "@/lib/apiAdapter";\n` +
      content.replace(/export\s+default\s+async\s+function\s*(\w*)\s*\(/, `async function ${fnName}(`) +
      `\n\nexport const { GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS } = createRouteHandler(${fnName});\n`;
  }
  // Case 3: export default function handler / export default function ...
  else if (/export\s+default\s+function\s*(\w*)\s*\(/.test(content)) {
    const fnNameMatch = content.match(/export\s+default\s+function\s*(\w*)\s*\(/);
    const fnName = fnNameMatch[1] || 'handler';
    convertedContent = `import { createRouteHandler } from "@/lib/apiAdapter";\n` +
      content.replace(/export\s+default\s+function\s*(\w*)\s*\(/, `function ${fnName}(`) +
      `\n\nexport const { GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS } = createRouteHandler(${fnName});\n`;
  }
  // Case 4: export default handler;
  else if (/export\s+default\s+(\w+);?/.test(content)) {
    const match = content.match(/export\s+default\s+(\w+);?/);
    const name = match[1];
    convertedContent = `import { createRouteHandler } from "@/lib/apiAdapter";\n` +
      content.replace(/export\s+default\s+(\w+);?/, `export const { GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS } = createRouteHandler(${name});`);
  }
  else {
    convertedContent = `import { createRouteHandler } from "@/lib/apiAdapter";\n` +
      content +
      `\n\nexport const { GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS } = createRouteHandler(handler);\n`;
  }

  fs.writeFileSync(targetFile, convertedContent, 'utf8');
  successCount++;
}

console.log(`Successfully migrated ${successCount} API routes into App Router route.ts files.`);
