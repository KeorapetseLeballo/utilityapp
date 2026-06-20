#!/usr/bin/env python3
"""Scaffold a fullstack web app with Next.js, GraphQL API, and PostgreSQL."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

DEFAULT_STACK = {
    "frontend": "nextjs-app-router",
    "backend": "graphql-node",
    "database": "postgresql-prisma",
    "auth": "none",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Scaffold a fullstack project with modern defaults."
    )
    parser.add_argument("project_path", help="Directory to create the project in")
    parser.add_argument(
        "--stack",
        choices=["nextjs-graphql-postgres", "nextjs-rest-postgres"],
        default="nextjs-graphql-postgres",
        help="Template preset",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print planned files without writing them",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Overwrite existing scaffold marker",
    )
    return parser.parse_args()


def build_tree(project: Path, stack: str) -> dict[str, str]:
    app_name = project.name
    files: dict[str, str] = {
        "package.json": json.dumps(
            {
                "name": app_name,
                "private": True,
                "scripts": {
                    "dev": "next dev",
                    "build": "next build",
                    "start": "next start",
                    "lint": "next lint",
                    "test": "vitest run",
                    "db:generate": "prisma generate",
                    "db:migrate": "prisma migrate dev",
                },
                "dependencies": {
                    "next": "^15.0.0",
                    "react": "^19.0.0",
                    "react-dom": "^19.0.0",
                    "@apollo/client": "^3.11.0",
                    "graphql": "^16.9.0",
                    "@prisma/client": "^6.0.0",
                },
                "devDependencies": {
                    "typescript": "^5.6.0",
                    "@types/node": "^22.0.0",
                    "@types/react": "^19.0.0",
                    "@types/react-dom": "^19.0.0",
                    "eslint": "^9.0.0",
                    "eslint-config-next": "^15.0.0",
                    "prisma": "^6.0.0",
                    "vitest": "^2.0.0",
                },
            },
            indent=2,
        )
        + "\n",
        "tsconfig.json": json.dumps(
            {
                "compilerOptions": {
                    "target": "ES2022",
                    "lib": ["dom", "dom.iterable", "es2022"],
                    "allowJs": False,
                    "skipLibCheck": True,
                    "strict": True,
                    "noEmit": True,
                    "module": "esnext",
                    "moduleResolution": "bundler",
                    "resolveJsonModule": True,
                    "isolatedModules": True,
                    "jsx": "preserve",
                    "incremental": True,
                    "plugins": [{"name": "next"}],
                    "paths": {"@/*": ["./src/*"]},
                },
                "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
                "exclude": ["node_modules"],
            },
            indent=2,
        )
        + "\n",
        ".env.example": "\n".join(
            [
                "DATABASE_URL=postgresql://postgres:postgres@localhost:5432/app",
                "NEXT_PUBLIC_GRAPHQL_URL=http://localhost:3000/api/graphql",
                "",
            ]
        ),
        ".gitignore": "\n".join(
            [
                "node_modules/",
                ".next/",
                "dist/",
                ".env",
                ".env.local",
                "coverage/",
                "",
            ]
        ),
        "prisma/schema.prisma": "\n".join(
            [
                'generator client {',
                '  provider = "prisma-client-js"',
                "}",
                "",
                'datasource db {',
                '  provider = "postgresql"',
                '  url      = env("DATABASE_URL")',
                "}",
                "",
                "model User {",
                "  id        String   @id @default(cuid())",
                "  email     String   @unique",
                "  name      String?",
                "  createdAt DateTime @default(now())",
                "  updatedAt DateTime @updatedAt",
                "}",
                "",
            ]
        ),
        "src/app/layout.tsx": "\n".join(
            [
                "import type { ReactNode } from 'react';",
                "",
                "export default function RootLayout({ children }: { children: ReactNode }) {",
                "  return (",
                "    <html lang=\"en\">",
                "      <body>{children}</body>",
                "    </html>",
                "  );",
                "}",
                "",
            ]
        ),
        "src/app/page.tsx": "\n".join(
            [
                "export default function HomePage() {",
                "  return (",
                "    <main>",
                "      <h1>Welcome to "
                + app_name
                + "</h1>",
                "      <p>Fullstack scaffold ready. Connect GraphQL and PostgreSQL next.</p>",
                "    </main>",
                "  );",
                "}",
                "",
            ]
        ),
        "src/app/api/graphql/route.ts": "\n".join(
            [
                "import { NextRequest } from 'next/server';",
                "",
                "export async function POST(request: NextRequest) {",
                "  const body = await request.json();",
                "  return Response.json({",
                "    data: {",
                "      health: 'ok',",
                "      message: 'Replace with Apollo Server or graphql-yoga handler',",
                "      operationName: body?.operationName ?? null,",
                "    },",
                "  });",
                "}",
                "",
            ]
        ),
        "src/lib/prisma.ts": "\n".join(
            [
                "import { PrismaClient } from '@prisma/client';",
                "",
                "const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };",
                "",
                "export const prisma =",
                "  globalForPrisma.prisma ??",
                "  new PrismaClient({",
                "    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],",
                "  });",
                "",
                "if (process.env.NODE_ENV !== 'production') {",
                "  globalForPrisma.prisma = prisma;",
                "}",
                "",
            ]
        ),
        "README.md": "\n".join(
            [
                f"# {app_name}",
                "",
                "Scaffolded fullstack app:",
                "- Next.js App Router frontend",
                "- GraphQL API route placeholder",
                "- PostgreSQL via Prisma",
                "",
                "## Setup",
                "",
                "```bash",
                "npm install",
                "cp .env.example .env",
                "npm run db:generate",
                "npm run db:migrate",
                "npm run dev",
                "```",
                "",
            ]
        ),
        ".scaffold-meta.json": json.dumps(
            {
                "generator": "senior-fullstack/fullstack_scaffolder.py",
                "stack": stack,
                "defaults": DEFAULT_STACK,
            },
            indent=2,
        )
        + "\n",
    }
    return files


def write_files(project: Path, files: dict[str, str], dry_run: bool) -> None:
    if dry_run:
        print(f"[dry-run] Would create project at: {project}")
        for rel in sorted(files):
            print(f"  - {rel}")
        return

    project.mkdir(parents=True, exist_ok=True)
    for rel, content in files.items():
        path = project / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
    print(f"Scaffold created at: {project}")
    print("Next steps:")
    print(f"  cd {project}")
    print("  npm install")
    print("  cp .env.example .env")
    print("  npm run db:generate && npm run db:migrate")
    print("  npm run dev")


def main() -> int:
    args = parse_args()
    project = Path(args.project_path).resolve()

    marker = project / ".scaffold-meta.json"
    if marker.exists() and not args.force:
        print(f"Error: scaffold marker already exists at {marker}. Use --force to overwrite.")
        return 1

    if project.exists() and any(project.iterdir()) and not args.force:
        print(f"Error: {project} is not empty. Use --force to scaffold anyway.")
        return 1

    files = build_tree(project, args.stack)
    write_files(project, files, args.dry_run)
    return 0


if __name__ == "__main__":
    sys.exit(main())
