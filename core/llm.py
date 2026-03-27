# RAG App — https://github.com/ramoncalvo
"""LLM client using Ollama via OpenAI-compatible API."""

import json

from openai import OpenAI

from .ollama_manager import OLLAMA_URL, DEFAULT_MODEL

AGENT_INSTRUCTIONS = """
ACCIONES DISPONIBLES:
Puedes incluir acciones en tu respuesta para controlar la interfaz del usuario.

- open_pdf: Abre un documento PDF en el visor integrado en una pagina especifica.
  Parametros: doc_title (titulo del documento), page (numero de pagina).
  Usala cuando el usuario pida ver, mostrar, o abrir una pagina o seccion de un documento.

FORMATO DE RESPUESTA:
Responde SIEMPRE en JSON valido con esta estructura:
{
  "text": "Tu respuesta en texto plano aqui...",
  "actions": []
}

- "text": Tu respuesta textual. Separa parrafos con \\n\\n. No uses asteriscos para formato.
- "actions": Array de acciones a ejecutar. Vacio [] si no hay acciones.

Ejemplo con accion:
{
  "text": "Aqui esta la clausula que mencionas. Te abro el documento en la pagina correspondiente.",
  "actions": [{"type": "open_pdf", "doc_title": "contrato-prestacion-servicios", "page": 7}]
}

Ejemplo sin accion:
{
  "text": "Segun el contexto, los honorarios se establecen en la clausula tercera...",
  "actions": []
}
"""

DEFAULT_SYSTEM_PROMPT = (
    "Eres un asistente inteligente que responde preguntas basandose en documentos indexados "
    "(PDFs, transcripts de videos).\n\n"
    "REGLAS:\n"
    "- Responde SOLO con la informacion del contexto proporcionado.\n"
    "- Si no encuentras la respuesta en el contexto, dilo claramente.\n"
    "- Cuando cites informacion de un PDF, indica el titulo del documento y numero de pagina.\n"
    "- Cuando cites informacion de un video, indica el titulo del video y el momento exacto (ejemplo: 'en el minuto 3:25').\n"
    "- Si el usuario pregunta 'en que momento se habla de X', responde con el timestamp preciso del contexto.\n"
    "- No uses asteriscos (*) para formato."
)


def _get_client() -> OpenAI:
    return OpenAI(
        api_key="ollama",
        base_url=f"{OLLAMA_URL}/v1",
    )


def generate_answer(question: str, context: str, model: str = DEFAULT_MODEL,
                    system_prompt: str | None = None) -> dict:
    """Returns {"text": str, "actions": list[dict]}"""
    client = _get_client()
    user_prompt = system_prompt or DEFAULT_SYSTEM_PROMPT
    full_system = user_prompt + "\n\n" + AGENT_INSTRUCTIONS

    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": full_system},
                {
                    "role": "user",
                    "content": f"Contexto de documentos indexados:\n\n{context}\n\n---\n\nPregunta: {question}",
                },
            ],
        )

        content = response.choices[0].message.content
        try:
            data = json.loads(content)
            text = data.get("text", "").replace("*", "")
            actions = data.get("actions", [])
            valid_actions = []
            for a in actions:
                if isinstance(a, dict) and a.get("type") in ("open_pdf",):
                    valid_actions.append(a)
            return {"text": text, "actions": valid_actions}
        except (json.JSONDecodeError, ValueError):
            return {"text": content.replace("*", ""), "actions": []}
    except Exception as e:
        return {"text": f"Error al consultar Ollama: {e}", "actions": []}


def generate_topics(video_samples: list[dict], model: str = DEFAULT_MODEL) -> str:
    topics_prompt = (
        "A partir del siguiente contenido, genera una lista de temas "
        "interesantes que se pueden discutir o explorar. "
        "Devuelve SOLO un JSON array de objetos con los campos: "
        '"topic" (nombre corto del tema), "description" (breve descripcion de 1 frase), '
        '"file_id" (el file_id relacionado). '
        "No incluyas nada mas que el JSON. Maximo 10 temas."
    )

    context_parts = []
    for v in video_samples:
        text = "\n".join(v["chunks"])
        context_parts.append(f"[Documento: {v['title']} (file_id: {v['file_id']})]\n{text}")

    context = "\n\n---\n\n".join(context_parts)
    client = _get_client()

    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": topics_prompt},
                {"role": "user", "content": context},
            ],
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"[]"
