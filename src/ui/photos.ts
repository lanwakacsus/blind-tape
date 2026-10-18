/* Attaches the image files to the credits in game/credits.ts. They are inlined into the page
 * by the build. */

import dunk from '../assets/dunk.jpg';
import geobasket from '../assets/geobasket.jpg';
import ken from '../assets/ken.jpg';
import lonely from '../assets/lonely.jpg';
import rick from '../assets/rick.jpg';
import type { Photo } from '../game/credits';

export const SRC: Record<Photo['id'], string> = { geobasket, dunk, ken, lonely, rick };
