const fs = require('fs');
const pdfParse = require('pdf-parse');
const Chunk = require('../models/Chunk');
const Material = require('../models/Material');
const Concept = require('../models/Concept');
const { embed, generateStructured } = require('./aiClient');

function chunkText(text, size = 800, overlap = 120) {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks = [];
  for (let i = 0; i < words.length; i += size - overlap) {
    chunks.push(words.slice(i, i + size).join(' '));
  }
  return chunks.filter((c) => c.length > 50);
}

async function processMaterial(materialId) {
  const material = await Material.findById(materialId);
  if (!material) throw new Error('Material not found');
  // idempotency: if already processed chunks exist, skip
  const existing = await Chunk.countDocuments({ material: material._id });
  if (material.status === 'ready' && existing > 0) return material;

  material.status = 'processing';
  await material.save();

  try {
    const buf = fs.readFileSync(material.filePath);
    const pdf = await pdfParse(buf);
    const fullText = (pdf.text || '').replace(/\s+\n/g, '\n').trim();
    if (!fullText || fullText.length < 100) throw new Error('No extractable text (scanned PDF needs OCR — out of prototype scope)');

    // naive page split: pdf-parse gives text; approximate pages via numpages
    const pages = pdf.numpages || 1;
    material.pages = pages;

    // split into chunks; assign page round-robin by position
    const rawChunks = chunkText(fullText);
    const perPage = Math.max(1, Math.ceil(rawChunks.length / pages));

    // delete old chunks for retry safety
    await Chunk.deleteMany({ material: material._id });

    const chunkDocs = rawChunks.map((text, i) => ({
      material: material._id,
      project: material.project,
      page: Math.min(pages, Math.floor(i / perPage) + 1),
      text,
      embedding: [],
    }));

    // embed in batches of 8 (cost/latency guard)
    let embeddings = [];
    try {
      embeddings = [];
      for (let i = 0; i < chunkDocs.length; i += 8) {
        const batch = chunkDocs.slice(i, i + 8).map((c) => c.text);
        const vecs = await embed(batch, { user: material.user, project: material.project });
        embeddings.push(...vecs);
      }
    } catch (e) {
      console.error('embed failed, continuing without vectors:', e.message);
      embeddings = chunkDocs.map(() => []);
    }
    chunkDocs.forEach((c, i) => { c.embedding = embeddings[i] || []; });
    await Chunk.insertMany(chunkDocs);

    // extract concepts (1 structured call, capped input)
    try {
      const sample = fullText.slice(0, 6000);
      const res = await generateStructured(
        `Extract 5-8 key learning concepts from this study material. Schema: {"concepts":[{"name":"...","description":"..."}]}\n\nMATERIAL:\n${sample}`,
        { user: material.user, project: material.project, feature: 'concept-extract' }
      );
      const concepts = res.concepts || res || [];
      for (const c of [].concat(concepts).slice(0, 8)) {
        if (!c?.name) continue;
        await Concept.updateOne(
          { project: material.project, name: c.name.trim() },
          { $set: { description: (c.description || '').slice(0, 300) } },
          { upsert: true }
        );
      }
    } catch (e) { console.error('concept extract failed:', e.message); }

    material.status = 'ready';
    material.error = '';
    await material.save();
    return material;
  } catch (e) {
    material.status = 'failed';
    material.error = e.message.slice(0, 500);
    await material.save();
    throw e;
  }
}

module.exports = { processMaterial, chunkText };
