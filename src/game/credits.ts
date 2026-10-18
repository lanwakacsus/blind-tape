/* The photographs on the site are freely licensed, from Wikimedia Commons. Each one is shown
 * resized and in greyscale, and each is credited here, on the /credits page and under the
 * picture where it is shown. Pure data: the image files are attached in ui/photos.ts. */

export interface Photo {
  id: 'geobasket' | 'dunk' | 'rick' | 'ken' | 'lonely';
  /** What the author calls it. */
  label: string;
  author: string;
  license: string;
  licenseUrl: string;
  /** The Commons page for the file. */
  page: string;
}

export const PHOTOS: Photo[] = [
  { id: 'geobasket', label: 'geobasket', author: 'Reddeleon', license: 'CC0 1.0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', page: 'https://commons.wikimedia.org/wiki/File:Rick_Owens_Geobasket_sneaker.jpg' },
  { id: 'dunk', label: 'dunks', author: 'Jgourl', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/', page: 'https://commons.wikimedia.org/wiki/File:Rick_Owens_Dunk.png' },
  { id: 'rick', label: 'rick owens', author: 'Asha Mines', license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/', page: 'https://commons.wikimedia.org/wiki/File:Rick_Owens_(cropped).jpg' },
  { id: 'ken', label: 'ken carson', author: 'dylanisswagger', license: 'CC BY 3.0', licenseUrl: 'https://creativecommons.org/licenses/by/3.0/', page: 'https://commons.wikimedia.org/wiki/File:Ken_Carson_live_on_Chaos_Tour_at_Milwaukee_2024.jpg' },
  { id: 'lonely', label: 'destroy lonely', author: 'Wojciech Pędzich', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', page: 'https://commons.wikimedia.org/wiki/File:Destroy_Lonely,_Clout_Festival_2024_05_(cropped).jpg' },
];

/** Which photo lies over the chart of each market (index = level; the last is the daily tape). */
export const CHART_PHOTO: Photo['id'][] = ['geobasket', 'dunk', 'ken', 'lonely', 'rick', 'ken'];

export const photo = (id: Photo['id']): Photo => PHOTOS.find((p) => p.id === id)!;

/** "photo: Reddeleon, CC0 1.0, Wikimedia Commons" */
export const credit = (p: Photo): string => `photo: ${p.author}, ${p.license}, Wikimedia Commons`;

/** The text of /credits. */
export function creditsPage(): string {
  const lines = PHOTOS.map((p) => `${p.label}\n  by ${p.author}\n  ${p.license}  ${p.licenseUrl}\n  ${p.page}`);
  return `photographs\n\nthese are not mine. i would have taken them.\nthey are freely licensed, from wikimedia commons.\neach is resized and made grey. nothing else was changed.\n\n${lines.join('\n\n')}\n\neverything else on this page is mine. do not copy it. i will know.`;
}
