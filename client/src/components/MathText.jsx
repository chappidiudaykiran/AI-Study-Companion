import katex from 'katex';
import 'katex/dist/katex.min.css';

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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
        return <span key={i} dangerouslySetInnerHTML={{ __html: renderMathSegment(part) }} />;
      })}
    </span>
  );
}
