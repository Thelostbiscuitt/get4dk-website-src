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
    'derivatives of the originals; no other modification was made.',
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
  lines.push('All other imagery on this site (4DK identity system, application');
  lines.push('screenshots, banner art) is project-owned.');
  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
