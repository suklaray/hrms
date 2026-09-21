// scripts/migratePages.mjs
import fs from 'fs';
import path from 'path';

const PAGES_SRC = 'F:/Office works/hrms/pages';
const APP_DEST = 'F:/Office works/hrms_v2/src/app';

function getAllPageFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of list) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      if (item.name !== 'api') {
        results = results.concat(getAllPageFiles(fullPath));
      }
    } else if (item.name.endsWith('.js') && !item.name.startsWith('_')) {
      results.push(fullPath);
    }
  }
  return results;
}

function extractGSSP(content) {
  const match = content.match(/export\s+async\s+function\s+getServerSideProps[\s\S]*?\)\s*\{/);
  if (!match) return null;
  const startIndex = match.index;
  const braceIndex = startIndex + match[0].length - 1; // Function body opening '{'
  let depth = 1;
  let endIndex = -1;
  for (let i = braceIndex + 1; i < content.length; i++) {
    if (content[i] === '{') depth++;
    else if (content[i] === '}') {
      depth--;
      if (depth === 0) {
        endIndex = i + 1;
        break;
      }
    }
  }
  if (endIndex === -1) return null;
  return {
    fullGSSP: content.substring(startIndex, endIndex),
    startIndex,
    endIndex,
  };
}

function getRoutePath(relPath) {
  let norm = relPath.replace(/\\/g, '/');
  if (norm === 'index.js') return '';
  if (norm.endsWith('/index.js')) {
    return path.dirname(norm).replace(/\\/g, '/');
  }
  return norm.replace(/\.js$/, '');
}

const files = getAllPageFiles(PAGES_SRC);
console.log(`Found ${files.length} UI pages to migrate.`);

let gsspCount = 0;
let clientCount = 0;

for (const file of files) {
  const relPath = path.relative(PAGES_SRC, file);
  const routePath = getRoutePath(relPath);
  const targetDir = path.join(APP_DEST, routePath);

  fs.mkdirSync(targetDir, { recursive: true });

  let content = fs.readFileSync(file, 'utf8');

  // Replace next/router and next/head
  content = content.replace(/from\s+['"]next\/router['"]/g, 'from "@/lib/compatRouter"');
  content = content.replace(/from\s+['"]next\/head['"]/g, 'from "@/lib/compatHead"');

  const gssp = file.includes('employee\\dashboard.js') ? null : extractGSSP(content);

  if (gssp) {
    gsspCount++;
    // 1. Create Client.tsx
    let clientContent = content.substring(0, gssp.startIndex) + content.substring(gssp.endIndex);
    
    // Find default export
    let defaultExportName = 'ClientPageComponent';
    const defExportMatch = clientContent.match(/export\s+default\s+function\s*(\w*)\s*\(/);
    const defIdentMatch = clientContent.match(/export\s+default\s+(\w+);?/);

    if (defExportMatch) {
      defaultExportName = defExportMatch[1] || 'MainComponent';
      clientContent = clientContent.replace(/export\s+default\s+function\s*(\w*)\s*\(/, `function ${defaultExportName}(`);
    } else if (defIdentMatch) {
      defaultExportName = defIdentMatch[1];
      clientContent = clientContent.replace(/export\s+default\s+\w+;?/, '');
    }

    const clientFileContent = `"use client";\n\nimport { Suspense } from "react";\n` +
      clientContent +
      `\n\nexport default function ClientPageWrapper(props: any) {\n  return (\n    <Suspense fallback={null}>\n      <${defaultExportName} {...props} />\n    </Suspense>\n  );\n}\n`;

    fs.writeFileSync(path.join(targetDir, 'Client.tsx'), clientFileContent, 'utf8');

    // 2. Create page.tsx (Server Component)
    const gsspCode = gssp.fullGSSP.replace(/export\s+async\s+function\s+getServerSideProps/, 'async function getServerSideProps');
    const safeRouteName = (routePath || 'index').replace(/\\/g, '/');

    const serverPageContent = `import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import ClientPage from "./Client";
import prisma from "@/lib/prisma";
import { getUserFromToken } from "@/lib/getUserFromToken";
import { checkPermission, getUserPermissions, isSuperAdmin } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export const dynamic = "force-dynamic";

${gsspCode}

export default async function Page(props: {
  params?: Promise<Record<string, string | string[]>>;
  searchParams?: Promise<Record<string, string | string[]>>;
}) {
  const cookieStore = await cookies();
  const resolvedParams = (await props.params) || {};
  const resolvedSearchParams = (await props.searchParams) || {};

  const cookieMap: Record<string, string> = {};
  cookieStore.getAll().forEach((c) => {
    cookieMap[c.name] = c.value;
  });

  const context = {
    req: {
      cookies: cookieMap,
      headers: {},
    },
    params: resolvedParams,
    query: { ...resolvedParams, ...resolvedSearchParams },
  };

  let gsspResult: any = null;
  try {
    gsspResult = await getServerSideProps(context);
  } catch (err) {
    console.error("Error running getServerSideProps in ${safeRouteName}:", err);
  }

  if (gsspResult?.redirect?.destination) {
    redirect(gsspResult.redirect.destination);
  }

  return (
    <Suspense fallback={null}>
      <ClientPage {...(gsspResult?.props || {})} />
    </Suspense>
  );
}
`;
    fs.writeFileSync(path.join(targetDir, 'page.tsx'), serverPageContent, 'utf8');
  } else {
    clientCount++;
    // Pure Client page
    let pageContent = content;
    let defaultExportName = 'ClientPageComponent';
    const defExportMatch = pageContent.match(/export\s+default\s+function\s*(\w*)\s*\(/);
    const defIdentMatch = pageContent.match(/export\s+default\s+(\w+);?/);

    if (defExportMatch) {
      defaultExportName = defExportMatch[1] || 'MainComponent';
      pageContent = pageContent.replace(/export\s+default\s+function\s*(\w*)\s*\(/, `function ${defaultExportName}(`);
    } else if (defIdentMatch) {
      defaultExportName = defIdentMatch[1];
      pageContent = pageContent.replace(/export\s+default\s+\w+;?/, '');
    }

    const finalPageContent = `"use client";\n\nimport { Suspense } from "react";\n` +
      pageContent +
      `\n\nexport default function PageWrapper(props: any) {\n  return (\n    <Suspense fallback={null}>\n      <${defaultExportName} {...props} />\n    </Suspense>\n  );\n}\n`;

    fs.writeFileSync(path.join(targetDir, 'page.tsx'), finalPageContent, 'utf8');
  }
}

console.log(`Migrated ${gsspCount} pages with GSSP and ${clientCount} pure client pages.`);
