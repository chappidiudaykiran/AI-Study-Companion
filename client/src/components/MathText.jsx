import katex from 'katex';
import 'katex/dist/katex.min.css';

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderInlineMd(html) {
  return html
    .replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+?)`/g, '<code class="rounded bg-slate-900/80 px-1 font-mono text-[12px] text-green-200">$1</code>')
    .replace(/(^|[\s(>])\*([^*\n]+?)\*/g, '$1<em>$2</em>');
}

function renderRichSegment(seg) {
  const withMath = renderMathSegment(seg);
  const lines = withMath.split('\n');
  const out = [];
  let list = null;
  const flush = () => {
    if (!list) return;
    const tag = list.ordered ? 'ol' : 'ul';
    const cls = list.ordered ? 'list-decimal' : 'list-disc';
    out.push(`<${tag} class="my-1.5 space-y-1 ${cls} pl-5">` + list.items.map((t) => `<li>${renderInlineMd(t)}</li>`).join('') + `</${tag}>`);
    list = null;
  };
  for (const line of lines) {
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      flush();
      const lvl = h[1].length;
      const sizes = { 1: 'text-lg', 2: 'text-base', 3: 'text-[15px]', 4: 'text-sm' };
      out.push(`<strong class="mt-1 block font-heading ${sizes[lvl]} font-extrabold">${renderInlineMd(h[2])}</strong>`);
      continue;
    }
    const b = line.match(/^\s*(?:[-*•]|(\d+)[.)])\s+(.*)$/);
    if (b && b[2].trim()) {
      const ordered = !!b[1];
      if (!list || list.ordered !== ordered) { flush(); list = { ordered, items: [] }; }
      list.items.push(b[2]);
      continue;
    }
    flush();
    out.push(renderInlineMd(line));
  }
  flush();
  // separate plain lines like before
  return out.join('<br/>').replace(/(<\/(?:ul|ol)>)(<br\/>)+/g, '$1').replace(/(<br\/>)+(<(?:ul|ol)[ >])/g, '$2');
}

// Strips academic bracket citations ([1], [1][3], [2, 4]) left in AI prose.
// Math spans ($…$, $$…$$, \(…\), \[…\]) are never touched.
function stripBracketCitations(s) {
  const parts = String(s || '').split(/(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|\$[^$\n]+?\$)/g);
  return parts
    .map((p, i) => {
      if (i % 2 === 1) return p;
      return p
        .replace(/\[\d{1,3}(?:[\s,\-–]+\d{1,3})*\](?:\s*\[\d{1,3}(?:[\s,\-–]+\d{1,3})*\])*/g, '')
        .replace(/^\s*[.,;]\s*$/gm, '')
        .replace(/[ \t]{2,}/g, ' ')
        .replace(/ ([.,;])/g, '$1');
    })
    .join('');
}
function renderMathSegment(seg) {
  // display math first, then inline; \( \) and \[ \] supported
  let out = escapeHtml(seg);
  out = out.replace(/\$\$([\s\S]+?)\$\$/g, (_, tex) => {
    try {
      return katex.renderToString(tex, { displayMode: true, throwOnError: false });
    } catch {
      return `$${tex}$`;
    }
  });
  out = out.replace(/\\\[([\s\S]+?)\\\]/g, (_, tex) => {
    try {
      return katex.renderToString(tex, { displayMode: true, throwOnError: false });
    } catch {
      return tex;
    }
  });
  out = out.replace(/\\\((.+?)\\\)/g, (_, tex) => {
    try {
      return katex.renderToString(tex, { displayMode: false, throwOnError: false });
    } catch {
      return tex;
    }
  });
  out = out.replace(/\$([^$\n]+?)\$/g, (_, tex) => {
    try {
      return katex.renderToString(tex, { displayMode: false, throwOnError: false });
    } catch {
      return `$${tex}$`;
    }
  });
  return out;
}

// Renders tutor text with LaTeX ($…$, $$…$$, \(…\), \[…\]); code fences stay literal.
export default function MathText({ text }) {
  const parts = String(text || '').split(/(```[\s\S]*?```)/g);
  return (
    <span className="whitespace-pre-wrap">
      {parts.map((part, i) => {
        if (part.startsWith('```')) {
          const code = part.replace(/^```\w*\n?/, '').replace(/```$/, '');
          return (
            <pre key={i} className="mt-1 overflow-x-auto rounded-lg bg-slate-900 p-2 font-mono text-xs text-green-200">{code}</pre>
          );
        }
        return <span key={i} dangerouslySetInnerHTML={{ __html: renderRichSegment(stripBracketCitations(part)) }} />;
      })}
    </span>
  );
}
