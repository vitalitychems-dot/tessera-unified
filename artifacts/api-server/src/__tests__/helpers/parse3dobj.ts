// Mirror of the parser in
// artifacts/tessera/src/components/chat/ChatObject3D.tsx so the api-server
// test can verify that emitted [3DOBJ:...] tokens parse to the expected
// client-side spec (in particular: a custom GLB src yields type="custom"
// with the persisted src, not a fallback primitive).

export interface Object3DSpec {
  type: string;
  label?: string;
  color?: string;
  secondaryColor?: string;
  size?: number;
  detail?: string;
  src?: string;
}

export function parse3DObjectBlocks(text: string): { text: string; objects: Object3DSpec[] } {
  const objects: Object3DSpec[] = [];
  const regex = /\[3DOBJ:([^\]]+)\]/g;
  const cleaned = text.replace(regex, (_match, attrs: string) => {
    const spec: Record<string, string> = {};
    attrs.replace(/(\w+)="([^"]*)"/g, (_: string, k: string, v: string) => {
      spec[k] = v;
      return "";
    });
    if (spec.type || spec.label) {
      objects.push({
        type: spec.type || "abstract",
        label: spec.label,
        color: spec.color,
        secondaryColor: spec.secondary || spec.secondaryColor,
        size: spec.size ? parseFloat(spec.size) : undefined,
        detail: spec.detail,
        src: spec.src,
      });
    }
    return "";
  });
  return { text: cleaned.trim(), objects };
}
