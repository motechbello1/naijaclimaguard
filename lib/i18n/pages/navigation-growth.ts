import type { AppLocale } from "../config";

type Dict = Record<string, string>;

export const NAVIGATION_GROWTH_COPY: Record<AppLocale, Dict> = {
  en: {},
  pcm: {
    "All tools": "All tools",
    "Revenue Engine": "How we dey make money",
    "Find any tool": "Find any tool",
    "Search every feature in one place": "Find every feature for one place",
  },
  ha: {
    "All tools": "Duk kayan aiki",
    "Revenue Engine": "Hanyoyin samun kuɗi",
    "Find any tool": "Nemo kowane kayan aiki",
    "Search every feature in one place": "Nemo duk fasaloli a wuri guda",
  },
  yo: {
    "All tools": "Gbogbo irinṣẹ́",
    "Revenue Engine": "Ọ̀nà tí a fi ń wọlé",
    "Find any tool": "Wá irinṣẹ́ eyikeyi",
    "Search every feature in one place": "Wá gbogbo iṣẹ́ ní ibi kan",
  },
  ig: {
    "All tools": "Ngwaọrụ niile",
    "Revenue Engine": "Ụzọ ego si abata",
    "Find any tool": "Chọta ngwa ọ bụla",
    "Search every feature in one place": "Chọta ọrụ niile n'otu ebe",
  },
};
