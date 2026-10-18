/* Attaches the image files to the credits in game/credits.ts. They are inlined into the page
 * by the build. */

import jacket from '../assets/jacket.jpg';
import ken2 from '../assets/ken2.jpg';
import lonely2 from '../assets/lonely2.jpg';
import lonely3 from '../assets/lonely3.jpg';
import rick2 from '../assets/rick2.jpg';
import rick3 from '../assets/rick3.jpg';
import dunk from '../assets/dunk.jpg';
import geobasket from '../assets/geobasket.jpg';
import ken from '../assets/ken.jpg';
import lonely from '../assets/lonely.jpg';
import rick from '../assets/rick.jpg';
import type { Photo } from '../game/credits';

export const SRC: Record<Photo['id'], string> = { geobasket, dunk, ken, lonely, rick, ken2, lonely2, lonely3, rick2, rick3, jacket };
