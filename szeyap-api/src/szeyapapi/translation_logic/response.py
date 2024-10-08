from .question import Question

# This class implements the response object, which is used to represent the response to a query by the user
# If there are any errors they will be included here
class Response:

    def __init__(self, question: Question) -> None:
        self.errors = []
        self.answers = []
        self.question = question
        self.metadata = {}
    
    def __repr__(self) -> str:
        return (f"{type(self).__name__}("
                f"question={self.question!r}, "
                f"errors={self.errors!r}, "
                f"answers={self.answers!r}"
                f"metadata={self.metadata!r}"
                ")")

    def add_error(self, error: dict) -> None:
        self.errors.append(error)
    
    def add_answer(self, answer: dict) -> None:
        self.answers.append(answer)
    
    def add_metadata(self, key: str, value: str) -> None:
        self.metadata[key] = value
    
    def as_api_resp(self) -> dict:
        resp = {
            "original_phrase": self.question.query,
            "detected_language": self.question.lang,
            "translations": self.answers,
            "metadata": self.metadata
        }

        if self.errors:
            resp["errors"] = self.errors
        
        return resp
