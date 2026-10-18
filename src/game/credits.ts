/* The photographs on the site are freely licensed, from Wikimedia Commons. Each one is shown
 * resized and in greyscale, and each is credited here, on the /credits page and under the
 * picture where it is shown. Pure data: the image files are attached in ui/photos.ts. */

export interface Photo {
  id: 'geobasket' | 'dunk' | 'rick' | 'ken' | 'lonely' | 'ken2' | 'lonely2' | 'lonely3' | 'rick2' | 'rick3' | 'jacket';
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
  { id: 'ken2', label: 'ken carson', author: 'xNicoNF', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', page: 'https://commons.wikimedia.org/wiki/File:Ken_Carson_performing_live_during_WTF_Tour_in_D%C3%BCsseldorf_(2026).jpg' },
  { id: 'lonely2', label: 'destroy lonely', author: 'Wojciech Pędzich', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', page: 'https://commons.wikimedia.org/wiki/File:Destroy_Lonely,_Clout_Festival_2024_03.jpg' },
  { id: 'lonely3', label: 'destroy lonely', author: 'Wojciech Pędzich', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', page: 'https://commons.wikimedia.org/wiki/File:Destroy_Lonely,_Clout_Festival_2024_06_(cropped).jpg' },
  { id: 'rick2', label: 'rick owens', author: 'Jtsimenc', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/', page: 'https://commons.wikimedia.org/wiki/File:Rick_Owens_1.jpg' },
  { id: 'rick3', label: 'rick owens, paris', author: 'Myles Kalus Anak Jihem', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/', page: 'https://commons.wikimedia.org/wiki/File:Rick_Owens_Paris_Fashion_Week_RTW_Spring_Summer_2019.jpg' },
  { id: 'jacket', label: 'jacket', author: 'Staff photographer, Rhode Island School of Design Museum of Art', license: 'CC0 1.0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', page: 'https://commons.wikimedia.org/wiki/File:2008_Rick_Owens_woman%27s_jacket,_leather,_cotton,_and_rayon_01.jpg' },
];

/** The photos that cycle on the front page, in order. */
export const REEL: Photo['id'][] = ['ken2', 'rick3', 'lonely2', 'jacket', 'ken', 'rick2', 'lonely3', 'geobasket', 'lonely', 'dunk', 'rick'];


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
