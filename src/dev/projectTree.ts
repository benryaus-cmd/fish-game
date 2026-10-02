import type { ProjectFileEntry } from '@/types/projectFiles';

interface TreeNode {
  name: string;
  children: Map<string, TreeNode>;
  isFile: boolean;
}

const newFolder = (name: string): TreeNode => ({
  name,
  children: new Map(),
  isFile: false,
});

const renderNode = (
  node: TreeNode,
  prefix: string,
  lines: string[],
): void => {
  const entries = Array.from(node.children.values());
  const folders = entries.filter((c) => !c.isFile).sort((a, b) => a.name.localeCompare(b.name));
  const files = entries.filter((c) => c.isFile).sort((a, b) => a.name.localeCompare(b.name));
  const ordered = [...folders, ...files];

  ordered.forEach((child, i) => {
    const last = i === ordered.length - 1;
    const connector = last ? '└── ' : '├── ';
    const icon = child.isFile ? '📄 ' : '📁 ';
    lines.push(`${prefix}${connector}${icon}${child.name}`);
    if (!child.isFile) {
      renderNode(child, `${prefix}${last ? '    ' : '│   '}`, lines);
    }
  });
};

export const generateTree = (files: ProjectFileEntry[]): string => {
  const root: TreeNode = { name: './', children: new Map(), isFile: false };

  for (const file of files) {
    const segments = file.path.split('/').filter(Boolean);
    let node = root;
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const isLast = i === segments.length - 1;
      let child = node.children.get(seg);
      if (!child) {
        child = isLast ? { name: seg, children: new Map(), isFile: true } : newFolder(seg);
        node.children.set(seg, child);
      }
      node = child;
    }
  }

  const lines: string[] = ['📁 ./'];
  renderNode(root, '', lines);
  return lines.join('\n');
};