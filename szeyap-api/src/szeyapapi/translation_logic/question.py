from ..utils.enums import LanguageFormats as Lang
from ..utils.enums import QueryTypes as Qtype

# This class describes the question object, which is used to represent a query by the user
# The question object contains the user's query type, the query itself, and may contain the type of language the query is in
# The question object is meant to be transformed by a transformer, like the translator class, and returned with a response
# For example, when passed to the translator, the translator will append translation response objects or a list of errors
# encountered during the translation process and return this to the caller
class Question:

    def __init__(self, query: str, q_type: Qtype):
        self.query: str = query
        self.q_type: Qtype = q_type

    def __repr__(self):
        return (f"{type(self).__name__}("
                f"query={self.query!r}, "
                f"q_type={self.q_type!r}"
                ")")

class TranslationQuestion(Question):

    def __init__(self, query: str, lang: Lang) -> None:
        super().__init__(query, Qtype.TRANSLATE)
        self.lang: Lang = lang # if lang != Lang.UNK else Translator.detect_language_format(query)
    
    def __repr__(self) -> str:
        query = super().__repr__()[:-1] + f", lang={self.lang})"
        return query
