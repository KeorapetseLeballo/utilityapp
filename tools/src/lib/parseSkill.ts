export interface SkillFrontmatter {
  name?: string;
  description?: string;
  "disable-model-invocation"?: boolean | string;
  [key: string]: string | boolean | undefined;
}

export interface ParsedSkill {
  frontmatter: SkillFrontmatter;
  body: string;
  raw: string;
}

export interface SkillValidationIssue {
  level: "error" | "warning";
  message: string;
}

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;

function parseFrontmatterBlock(block: string): SkillFrontmatter {
  const result: SkillFrontmatter = {};

  for (const line of block.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf(":");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (value === "true") {
      result[key] = true;
    } else if (value === "false") {
      result[key] = false;
    } else {
      result[key] = value;
    }
  }

  return result;
}

export function parseSkillMarkdown(content: string): ParsedSkill | null {
  const match = content.match(FRONTMATTER_PATTERN);
  if (!match) return null;

  return {
    frontmatter: parseFrontmatterBlock(match[1]),
    body: match[2].trim(),
    raw: content,
  };
}

export function validateSkill(parsed: ParsedSkill): SkillValidationIssue[] {
  const issues: SkillValidationIssue[] = [];
  const { name, description } = parsed.frontmatter;

  if (!name) {
    issues.push({ level: "error", message: "Missing required frontmatter field: name" });
  } else if (typeof name !== "string") {
    issues.push({ level: "error", message: "name must be a string" });
  } else if (name.length > 64) {
    issues.push({ level: "error", message: "name must be 64 characters or fewer" });
  } else if (!/^[a-z0-9-]+$/.test(name)) {
    issues.push({
      level: "error",
      message: "name must use lowercase letters, numbers, and hyphens only",
    });
  }

  if (!description) {
    issues.push({
      level: "error",
      message: "Missing required frontmatter field: description",
    });
  } else if (typeof description !== "string") {
    issues.push({ level: "error", message: "description must be a string" });
  } else if (description.length > 1024) {
    issues.push({
      level: "error",
      message: "description must be 1024 characters or fewer",
    });
  }

  if (!parsed.body.trim()) {
    issues.push({ level: "warning", message: "Skill body is empty" });
  }

  return issues;
}

export function isValidSkillFileName(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return lower === "skill.md" || lower === "skills.md";
}

export async function readSkillFile(file: File): Promise<string> {
  return file.text();
}
