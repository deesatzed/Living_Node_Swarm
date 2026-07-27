"""Real OpenRouter client. Model id must be supplied by user (env or request)."""

from __future__ import annotations

import json
import re
from typing import Any

import httpx

from lns_server.proposal_normalize import strip_json_fences
from lns_server.settings import Settings


class OpenRouterError(RuntimeError):
    pass


class OpenRouterClient:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def require_key(self) -> str:
        key = self.settings.openrouter_api_key
        if not key:
            raise OpenRouterError(
                "OPENROUTER_API_KEY is not set. Export a real OpenRouter API key."
            )
        return key

    def resolve_model(self, model: str | None) -> str:
        m = (model or self.settings.default_model() or "").strip()
        if not m:
            raise OpenRouterError(
                "No model specified. Set MODEL_REASONING / MODEL_FAST / OPENROUTER_MODEL "
                "in repo .env, or pass model in the request body. You choose OpenRouter model ids."
            )
        return m

    def chat_json(
        self,
        *,
        model: str | None,
        system: str,
        user: str,
        temperature: float = 0.2,
    ) -> dict[str, Any]:
        """Call OpenRouter chat completions and parse the message content as JSON object."""
        api_key = self.require_key()
        model_id = self.resolve_model(model)
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        if self.settings.openrouter_site_url:
            headers["HTTP-Referer"] = self.settings.openrouter_site_url
        headers["X-Title"] = self.settings.openrouter_app_name

        body = {
            "model": model_id,
            "temperature": temperature,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            # Prefer JSON mode when supported; models that ignore it still return text we parse.
            "response_format": {"type": "json_object"},
        }
        url = f"{self.settings.openrouter_base_url.rstrip('/')}/chat/completions"
        try:
            with httpx.Client(timeout=120.0) as client:
                resp = client.post(url, headers=headers, json=body)
        except httpx.TimeoutException as e:
            raise OpenRouterError(f"OpenRouter request timed out for model={model_id}") from e
        except httpx.HTTPError as e:
            raise OpenRouterError(f"OpenRouter network error: {e}") from e

        if resp.status_code >= 400:
            # Retry once without response_format for models that reject it
            if resp.status_code in (400, 404, 422) and "response_format" in resp.text.lower():
                body.pop("response_format", None)
                with httpx.Client(timeout=120.0) as client:
                    resp = client.post(url, headers=headers, json=body)
            if resp.status_code >= 400:
                raise OpenRouterError(
                    f"OpenRouter HTTP {resp.status_code} model={model_id}: {resp.text[:800]}"
                )

        try:
            data = resp.json()
        except json.JSONDecodeError as e:
            raise OpenRouterError(
                f"OpenRouter returned non-JSON body: {resp.text[:400]}"
            ) from e

        try:
            content = data["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError) as e:
            raise OpenRouterError(f"Unexpected OpenRouter response shape: {data!r}") from e

        if content is None:
            raise OpenRouterError(f"Empty content from model={model_id}: {data!r}")
        if not isinstance(content, str):
            # some providers return list of parts
            content = json.dumps(content)

        cleaned = strip_json_fences(content)
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            # last resort: extract first {...} block
            m = re.search(r"\{[\s\S]*\}", cleaned)
            if m:
                try:
                    return json.loads(m.group(0))
                except json.JSONDecodeError as e:
                    raise OpenRouterError(
                        f"Model did not return valid JSON: {content[:500]}"
                    ) from e
            raise OpenRouterError(f"Model did not return valid JSON: {content[:500]}")
