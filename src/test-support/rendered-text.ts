/* Test-only, so it sits outside `src/lib` and never reaches the bundle. The few
   component tests assert on the strings a screen renders rather than on its
   structure, and those strings sit arbitrarily deep in the tree. */
import type { ReactTestRenderer, ReactTestRendererJSON } from 'react-test-renderer';

type Rendered = ReactTestRendererJSON | ReactTestRendererJSON[] | null;

function textsIn(node: Rendered | string): string[] {
  if (typeof node === 'string') return [node];
  if (node === null) return [];
  if (Array.isArray(node)) return node.flatMap(textsIn);
  return (node.children ?? []).flatMap(textsIn);
}

/* Every string the tree renders, in the order it is read. */
export function renderedTexts(renderer: ReactTestRenderer): string[] {
  return textsIn(renderer.toJSON());
}
