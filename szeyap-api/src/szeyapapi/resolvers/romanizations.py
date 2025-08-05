from ..utils.enums import LanguageFormats as Lang
from ..translation_logic.penyim import Penyim


def get(phrase: str, src_lang: str):
    # construct Jyutping Object using phrase as sample
    penyim = Penyim(phrase, Lang[src_lang])

    return penyim.as_dict()
