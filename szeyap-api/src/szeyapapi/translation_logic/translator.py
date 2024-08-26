import re
from ..utils.enums import LanguageFormats as lang
from typing import List
from .response import Response
from .question import TranslationQuestion
from ..dictionaries.dictionary_base import DictionaryBase
from .phrase_definition import PhraseDefinition
from .jyutping import Jyutping


# A Translator receives Questions and create Responses
#  - the Translator is created by giving it a dictionary, and it uses the dictionary to create Responses
#  - like 3D printer, it takes in different colour filaments (different dictionaries) and prints designs (response objects)

class Translator:

    ENGLISH_MATCH_REGEX = r"^[a-zA-Z0-9\s\.,\?]*$"
    CHINESE_MATCH_REGEX = r"[\u4e00-\u9fff]+(?=,|\s|$)"
    JYUTPING_MATCH_REGEX = r"[A-Za-z]+[1-9]{2,3}\b"

    def __init__(self, name: str, dictionary: DictionaryBase):
        self.name: str = name
        self.data: DictionaryBase = dictionary
    
    def _search_dictionary(self, phrase: str, column: str):
        def _search_match_fn(x):
            return phrase in x[column]
        
        return filter(_search_match_fn, self.data.dictionary)

    def _search_dictionary_by_jyutping(self, jyutping: Jyutping) -> Response:
        def _search_match_fn(x):
            return any(jyutping == j and j is not None for j in x["JYUTPING"])

        return filter(_search_match_fn, self.data.dictionary)


    def _search_dictionary_by_chinese(self, ch_phrase: str) -> Response:
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
            jyut_as_api_resp = []
            for j, jyut in enumerate(defn["JYUTPING"]):
                if jyut and jyut.has_errors():
                    response.errors.append(f"#{i}: jyutping[{j}] - {jyut.summarize_errors()}")
                jyut_as_api_resp.append(jyut.as_dict() if jyut else None)
            
            return {
                "english": defn["DEFN"],
                "chinese": {
                    "traditional": defn["TRAD"],
                    "simplified": defn["SIMP"],
                    "penyim": defn["PENYIM"],
                    "jyutping": jyut_as_api_resp
                }
            }

        if not answers:
            return response
        for i, defn in enumerate(answers):
            response.add_answer(construct_translation(i, defn))
            if len(response.answers) == limit:
                break
        return response

    # based on the src language format, we search the dictionaries accordingly
    # Search algorithm is simple here, just iterate the dictionary and search for 
    # matching string
    def ask(self, q: TranslationQuestion, limit: int) -> Response:

        if q.lang == lang.CH or re.match(self.CHINESE_MATCH_REGEX, q.query):
            answers = self._search_dictionary_by_chinese(q.query)
            return self._construct_answer(q, answers, limit)
        
        jyutping = Jyutping(q.query, q.lang)
        if not jyutping.has_errors():                
            answers = self._search_dictionary_by_jyutping(jyutping)
            return self._construct_answer(q, answers, limit)
        
        answers = self._search_dictionary(q.query, "DEFN")
        return self._construct_answer(q, answers, limit)

    # def detect_language_format(self, sample: str):
    #     match_obj = re.search(self.JYUTPING_MATCH_REGEX, sample)
    #     if match_obj:
    #         # TODO: determine type of jyutping
    #         return lang.HSR

    #     match_obj = re.search(self.CHINESE_MATCH_REGEX, sample)
    #     if match_obj:
    #         return lang.CH

    #     match_obj = re.search(self.ENGLISH_MATCH_REGEX, sample)
    #     if match_obj:
    #         return lang.EN

    #     return lang.UNK
