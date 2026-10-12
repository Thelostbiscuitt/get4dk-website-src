import type { APIRoute } from 'astro';
import credits from '../data/credits.json';

/**
 * CC attribution credits (W9-R3): the standalone editorial photography on
 * this site is Wikimedia Commons material under CC-BY / CC-BY-SA licenses.
 * CC attribution requirements are satisfied by this stable, crawlable
 * credits document (TASL: Title, Author, Source, License).
 */
export const GET: APIRoute = () => {
  const lines: string[] = [
    '4DK (get4dk.com) — IMAGE CREDITS',
    '================================',
    '',
    'The following photographs ship as derivatives of Wikimedia Commons',
    'files. Each is credited per its Creative Commons license terms',
    '(Title / Author / Source / License). Crops are center-crop web',
    'derivatives of the originals. Embedded photos are cropped by the',
    'product interface in screenshots made with synthetic sample data.',
    '',
  ];
  for (const c of credits.images) {
    lines.push(`File:    ${c.file}`);
    lines.push(`Title:   ${c.title}`);
    lines.push(`Author:  ${c.author}`);
    lines.push(`Source:  ${c.source}`);
    lines.push(`License: ${c.license} ${c.license_url}`);
    lines.push(`Note:    ${c.note}`);
    lines.push('');
  }
  lines.push('The hero, meal-strip and tomato-spinach pasta images, banner artwork and');
  lines.push('handwritten notes were generated for 4DK using OpenAI image generation');
  lines.push('on 2026-10-11. They are editorial illustrations, not exact recipe results.');
  lines.push('Originals and generation records are retained with the release evidence.');
  lines.push('The 4DK identity and interface are project-owned. Product screenshots');
  lines.push('show the actual local interface with sample data and replacement media.');
  lines.push('Embedded tomato and garlic photos retain their CC-BY-SA-4.0 license;');
  lines.push('other embedded food photographs are credited above under their files.');
  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
