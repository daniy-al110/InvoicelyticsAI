import os
import time
import random
import asyncio
from typing import List, Dict, Optional, Any, AsyncGenerator
import google.generativeai as genai
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()

class AIProviderKey:
    def __init__(self, provider: str, key: str):
        self.provider = provider
        self.key = key
        self.usage_count = 0
        self.is_healthy = True
        self.last_failure_time = 0
        self.cooldown_period = 60  # seconds to wait after a 429

    def mark_failure(self):
        self.is_healthy = False
        self.last_failure_time = time.time()
        print(f"[AI-Service] Key for {self.provider} marked UNHEALTHY.")

    def check_health(self):
        if not self.is_healthy:
            if time.time() - self.last_failure_time > self.cooldown_period:
                self.is_healthy = True
                print(f"[AI-Service] Key for {self.provider} returned to HEALTHY state.")
        return self.is_healthy

class AIProviderPool:
    def __init__(self):
        self.keys: List[AIProviderKey] = []
        self._load_keys()

    def _load_keys(self):
        # Gemini
        gemini_keys = os.environ.get("GEMINI_API_KEYS", os.environ.get("GEMINI_API_KEY", "")).split(",")
        for k in gemini_keys:
            if k.strip():
                self.keys.append(AIProviderKey("gemini", k.strip()))
        
        # DeepSeek
        ds_keys = os.environ.get("DEEPSEEK_API_KEYS", os.environ.get("DEEPSEEK_API_KEY", "")).split(",")
        for k in ds_keys:
            if k.strip():
                self.keys.append(AIProviderKey("deepseek", k.strip()))

        print(f"[AI-Service] Loaded {len(self.keys)} providers into the pool.")



    def _get_best_key(self, preferred_provider: str = None) -> Optional[AIProviderKey]:
        healthy_keys = [k for k in self.keys if k.check_health()]
        if not healthy_keys:
            return None

        # Filter by preferred provider if specified
        if preferred_provider:
            pref_keys = [k for k in healthy_keys if k.provider == preferred_provider]
            if pref_keys:
                # Least used among preferred
                return min(pref_keys, key=lambda x: x.usage_count)

        # Otherwise, least used among all healthy
        return min(healthy_keys, key=lambda x: x.usage_count)

    async def generate_content(
        self, 
        prompt: Any, 
        system_instruction: str = None, 
        json_mode: bool = False, 
        preferred_provider: str = "gemini"
    ) -> Any:
        """
        Generates content using the best available key.
        'prompt' can be a string or a list of parts (for multimodal/vision).
        """
        key_obj = self._get_best_key(preferred_provider)
        if not key_obj:
            raise Exception("No healthy AI provider keys available.")

        key_obj.usage_count += 1
        
        try:
            if key_obj.provider == "gemini":
                genai.configure(api_key=key_obj.key)
                model = genai.GenerativeModel(
                    "gemini-flash-latest", 
                    system_instruction=system_instruction
                )
                loop = asyncio.get_event_loop()
                config = genai.GenerationConfig(
                    response_mime_type="application/json" if json_mode else "text/plain"
                )
                
                # If prompt is a list, it might contain multimodal data (e.g. Image or dict with mime_type)
                content_to_send = prompt
                
                response = await loop.run_in_executor(
                    None, 
                    lambda: model.generate_content(content_to_send, generation_config=config)
                )
                return response.text

            elif key_obj.provider == "deepseek":
                if isinstance(prompt, list):
                    # DeepSeek-Chat does not support vision yet in this pool implementation.
                    # Failover to Gemini if multimodal data is provided.
                    key_obj.mark_failure() # Temporarily mark as fail for this specific request type if we need vision
                    return await self.generate_content(prompt, system_instruction, json_mode, preferred_provider="gemini")

                base_url = "https://api.deepseek.com"
                model_name = "deepseek-chat"
                
                client = AsyncOpenAI(api_key=key_obj.key, base_url=base_url)
                messages = []
                if system_instruction:
                    messages.append({"role": "system", "content": system_instruction})
                messages.append({"role": "user", "content": prompt})
                
                response = await client.chat.completions.create(
                    model=model_name,
                    messages=messages,
                    response_format={"type": "json_object"} if json_mode else None
                )
                return response.choices[0].message.content


        except Exception as e:
            msg = str(e).lower()
            if "429" in msg or "quota" in msg or "resourceexhausted" in msg:
                key_obj.mark_failure()
                # Failover: try again recursively (will pick a different key)
                return await self.generate_content(prompt, system_instruction, json_mode, preferred_provider)
            raise e

    async def stream_content(self, prompt: str, history: List[Dict] = None, system_instruction: str = None, preferred_provider: str = "gemini") -> AsyncGenerator[str, None]:
        key_obj = self._get_best_key(preferred_provider)
        if not key_obj:
            yield "ERROR: No healthy AI provider keys available."
            return

        key_obj.usage_count += 1

        try:
            if key_obj.provider == "gemini":
                genai.configure(api_key=key_obj.key)
                model = genai.GenerativeModel("gemini-flash-latest", system_instruction=system_instruction)

                
                # Convert history
                gemini_history = []
                for msg in (history or []):
                    role = "user" if msg["role"] == "user" else "model"
                    gemini_history.append({"role": role, "parts": [msg["content"]]})
                
                chat = model.start_chat(history=gemini_history)
                loop = asyncio.get_event_loop()
                response_stream = await loop.run_in_executor(None, lambda: chat.send_message(prompt, stream=True))
                
                for chunk in response_stream:
                    yield chunk.text

            elif key_obj.provider == "deepseek":
                base_url = "https://api.deepseek.com"
                model_name = "deepseek-chat"
                
                client = AsyncOpenAI(api_key=key_obj.key, base_url=base_url)
                messages = []
                if system_instruction:
                    messages.append({"role": "system", "content": system_instruction})
                for msg in (history or []):
                    messages.append({"role": msg["role"], "content": msg["content"]})
                messages.append({"role": "user", "content": prompt})

                stream = await client.chat.completions.create(
                    model=model_name,
                    messages=messages,
                    stream=True
                )
                async for chunk in stream:
                    if chunk.choices[0].delta.content:
                        yield chunk.choices[0].delta.content


        except Exception as e:
            if "429" in str(e) or "quota" in str(e).lower():
                key_obj.mark_failure()
                # Failover to next key
                async for chunk in self.stream_content(prompt, history, system_instruction, preferred_provider):
                    yield chunk
            else:
                yield f"ERROR: AI Stream failed: {str(e)}"

# Singleton Instance
ai_pool = AIProviderPool()
