import { fromMarkdown } from 'mdast-util-from-markdown';

interface MarkdownNode {
  type: string;
  value?: string;
  url?: string;
  alt?: string | null;
  identifier?: string;
  children?: MarkdownNode[];
}

export function contentImages(body: string): { alt: string; url: string }[] {
  const tree = fromMarkdown(body);
  const nodes: MarkdownNode[] = [];
  const walk = (node: MarkdownNode) => {
    nodes.push(node);
    node.children?.forEach(walk);
  };
  walk(tree);
  const definitions = new Map<string, string>();
  for (const node of nodes) {
    if (node.type === 'definition' && node.identifier && node.url) {
      const id = node.identifier.toUpperCase();
      if (!definitions.has(id)) definitions.set(id, node.url);
    }
    if (node.type === 'html' && !/^\s*<!--[\s\S]*-->\s*$/.test(node.value || '')) {
      throw new Error(
        '본문에는 원시 HTML 대신 Markdown을 사용해 주세요. HTML 예제는 코드 블록에 작성합니다.',
      );
    }
  }
  return nodes
    .filter((node) => node.type === 'image' || node.type === 'imageReference')
    .map((node) => {
      const url =
        node.type === 'image' ? node.url : definitions.get(node.identifier!.toUpperCase());
      if (!url) throw new Error(`이미지 참조를 찾을 수 없습니다: ${node.identifier}`);
      if (!node.alt?.trim()) throw new Error('콘텐츠 이미지의 대체 텍스트가 필요합니다.');
      return { alt: node.alt, url };
    });
}
