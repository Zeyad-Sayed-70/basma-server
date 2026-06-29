import { BadRequestException } from '@nestjs/common';

const ALLOWED_NODE_TYPES = new Set([
  'doc',
  'paragraph',
  'heading',
  'bulletList',
  'orderedList',
  'listItem',
  'image',
  'codeBlock',
  'blockquote',
  'horizontalRule',
  'text',
  'hardBreak',
  'link',
]);

export function validateRichContent(bodyJson: unknown): void {
  if (!Array.isArray(bodyJson)) {
    throw new BadRequestException(
      'Rich content bodyJson must be an array of nodes',
    );
  }

  for (const node of bodyJson) {
    validateNode(node);
  }
}

function validateNode(node: unknown, depth = 0): void {
  if (depth > 20) {
    throw new BadRequestException('Rich content exceeds maximum nesting depth');
  }

  if (!node || typeof node !== 'object') {
    throw new BadRequestException('Each node must be an object');
  }

  const n = node as Record<string, unknown>;
  if (
    !n.type ||
    typeof n.type !== 'string' ||
    !ALLOWED_NODE_TYPES.has(n.type)
  ) {
    throw new BadRequestException(
      `Invalid or disallowed node type: "${String(n.type)}"`,
    );
  }

  if (n.type === 'image') {
    if (!n.attrs || typeof n.attrs !== 'object') {
      throw new BadRequestException('Image node must have attrs object');
    }
    const attrs = n.attrs as Record<string, unknown>;
    if (!attrs.src || typeof attrs.src !== 'string') {
      throw new BadRequestException('Image node must have attrs.src');
    }
    if (attrs.src.startsWith('http://') || attrs.src.startsWith('https://')) {
      return;
    }
    if (attrs.fileObjectKey && typeof attrs.fileObjectKey === 'string') {
      return;
    }
    throw new BadRequestException(
      'Image src must be a valid URL or fileObjectKey',
    );
  }

  if (n.content && Array.isArray(n.content)) {
    for (const child of n.content) {
      validateNode(child, depth + 1);
    }
  }
}
