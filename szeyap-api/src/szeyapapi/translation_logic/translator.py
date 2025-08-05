import re

import spacy
from wordfreq import word_frequency
from fast_langdetect import detect_multilingual

from szeyapapi.utils.enums import LanguageFormats as lang
from szeyapapi.translation_logic.response import Response
from szeyapapi.translation_logic.question import TranslationQuestion
from szeyapapi.dictionaries.dictionary_base import DictionaryBase
from szeyapapi.translation_logic.penyim import Penyim


# A Translator receives Questions and create Responses
#  - the Translator is created by giving it a dictionary, and it uses the dictionary to create Responses
#  - like 3D printer, it takes in different colour filaments (different dictionaries) and prints designs (response objects)


class Translator:
    nlp = spacy.load("en_core_web_sm")

    def __init__(self, name: str, dictionary: DictionaryBase):
        self.name: str = name
        self.data: DictionaryBase = dictionary
    
    def _search_dictionary(self, phrase: str, field: str, full_match: bool = True):
        """English search"""
        parsed = self.nlp(phrase)
        lemmatized_phrase = " ".join([tok.lemma_ for tok in parsed])

        def _search_match_fn(x):
            if full_match:
                return re.search(rf"\b{lemmatized_phrase.lower()}\b", x[field].lower()) is not None
            return phrase.lower() in x[field].lower()
        
        return filter(_search_match_fn, self.data.dictionary)

    def _search_dictionary_by_penyim(self, penyim: Penyim) -> Response:
        """Penyim search"""
        def _search_match_fn(x):
            return any(penyim == j and j is not None for j in x["JYUTPING"])
        return filter(_search_match_fn, self.data.dictionary)

    def _search_dictionary_by_chinese(self, ch_phrase: str) -> Response:
        """Chinese search"""
        def _search_match_fn(x):
            for trad in x["TRAD"]:
                if trad and ch_phrase in trad:
                    return True
                
            for simp in x["SIMP"]:
                if simp and ch_phrase in simp:
                    return True
        
        return filter(_search_match_fn, self.data.dictionary)

    def _construct_answer(self, q: TranslationQuestion, answers: list, limit: int) -> Response:
        response = Response(q)
        response.add_metadata("dictionary_name", self.data.name)
        response.add_metadata("dictionary_url", self.data.src_url)
        
        def construct_translation(i, defn):
            penyim_api_response = []
            for j, parsed_penyim in enumerate(defn["PENYIM"]):
                if parsed_penyim and parsed_penyim.has_errors():
                    response.errors.append(f"#{i}: penyim[{j}] - {parsed_penyim.summarize_errors()}")
                penyim_api_response.append(parsed_penyim.as_dict() if parsed_penyim else None)
            
            return {
                "english": defn["DEFN"],
                "chinese": {
                    "traditional": defn["TRAD"],
                    "simplified": defn["SIMP"],
                    "penyim": penyim_api_response
                }
            }

        if not answers:
            return response
        
        answers = self.rank_by_frequency(q, answers)

        for i, defn in enumerate(answers):
            response.add_answer(construct_translation(i, defn))
            if len(response.answers) == limit:
                break
        return response

    # based on the src language format, we search the dictionaries accordingly
    # Search algorithm is simple here, just iterate the dictionary and search for 
    # matching string
    def ask(self, q: TranslationQuestion, limit: int) -> Response:
        detected_language = detect_multilingual(q.query)[0]["lang"]

        # TODO: Automatically detect penyim type 
        parsed_penyim = Penyim(q.query, lang.JW)
        answers = self._search_dictionary_by_penyim(q.query)
        is_penyim = not parsed_penyim.has_errors()

        if is_penyim:
            answers = self._search_dictionary_by_penyim(parsed_penyim)
            q.lang = lang.JW
        elif detected_language == "zh":
            answers = self._search_dictionary_by_chinese(q.query)
            q.lang = lang.CH
        elif detected_language == "en":
            q.lang = lang.EN
            answers = self._search_dictionary(q.query, "DEFN", full_match=True)
        else:
            raise ValueError("Query could not be parsed as: English, Chinese, or Jyutping")
        return self._construct_answer(q, answers, limit)
    
    @staticmethod
    def rank_by_frequency(q: TranslationQuestion, results: list[dict]):
        ranked_results = []
        for result in results:
            word = result["TRAD"][0]
            if word is None:
                word = result["SIMP"][0]
            score = word_frequency(word, 'zh')
            ranked_results.append((result, score))

        ranked_results.sort(key=lambda item: item[1], reverse=True)
        return [item[0] for item in ranked_results]


if __name__ == "__main__":
    from szeyapapi.dictionaries.genechin_dictionary import GC
    from szeyapapi.dictionaries.stephenli_dictionary import SL

    translator = Translator("Gene Chin Translator", GC)