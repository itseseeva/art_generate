from cog import BasePredictor, Input, Path
import torch
import os
import sys
import traceback
import random
from diffusers import (
    StableDiffusionXLPipeline,
    DPMSolverMultistepScheduler
)
from compel import Compel, ReturnedEmbeddingsType

# === НАСТРОЙКИ ===
MODEL_FILENAME = "perfectdeliberate_v50.safetensors" 

DEFAULT_WIDTH = 832
DEFAULT_HEIGHT = 1216
DEFAULT_STEPS = 40        # Поднял до 40 (стандарт для качества)
DEFAULT_GUIDANCE = 7.0    # Строгость следования промпту

DEFAULT_NEGATIVE_PROMPTS = "poorly_detailed, worst_quality, bad_quality, extra fingers, missing fingers, lowres, bad anatomy, extra digits, jpeg artifacts, signature, watermark, username, conjoined, deformed fingers, short legs, body disproportion, bad ai-generated, text, halo, multiple views, displeasing, messy composition, clones"

class Predictor(BasePredictor):
    def setup(self):
        print(f"PYTHON VERSION: {sys.version}")
        self.weights_dir = "/src/weights"
        model_path = os.path.join(self.weights_dir, MODEL_FILENAME)
        
        print(f"Looking for model at: {model_path}")
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model not found: {model_path}")

        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.torch_dtype = torch.float16 if self.device == "cuda" else torch.float32

        # 1. Загрузка Pipeline
        try:
            print("Loading SDXL pipeline...")
            self.pipe = StableDiffusionXLPipeline.from_single_file(
                model_path,
                torch_dtype=self.torch_dtype,
                use_safetensors=True,
                variant="fp16" # Попытка загрузить fp16 веса если есть
            )
            print("Model loaded.")
        except Exception as e:
            raise RuntimeError(f"Failed to load model: {e}")

        # 2. НАСТРОЙКА СЕМПЛЕРА (КАК В AUTOMATIC1111)
        # DPM++ 2M Karras - золотой стандарт
        self.pipe.scheduler = DPMSolverMultistepScheduler.from_config(
            self.pipe.scheduler.config,
            use_karras_sigmas=True,      # ВАЖНО: Karras расписание шума
            algorithm_type="dpmsolver++",
            solver_order=2
        )
        
        self.pipe.to(self.device)

        # 3. Compel с отключенным обрезанием
        try:
            self.compel = Compel(
                tokenizer=[self.pipe.tokenizer, self.pipe.tokenizer_2],
                text_encoder=[self.pipe.text_encoder, self.pipe.text_encoder_2],
                returned_embeddings_type=ReturnedEmbeddingsType.PENULTIMATE_HIDDEN_STATES_NON_NORMALIZED,
                requires_pooled=[False, True],
                truncate_long_prompts=False 
            )
        except Exception as e:
            print(f"Warning: Compel init failed: {e}")
            self.compel = None

        # 4. Загрузка LORA
        self._load_loras()
        print("Pipeline ready.")

    def _load_loras(self):
        self.lora_loaded = False
        active_adapters = []
        adapter_weights = []
        
        lora_configs = [
            ("add-detail-xl.safetensors", "details", 1.0),
            ("sdxl_offset_example_v10.safetensors", "offset", 0.6),
            ("Dramatic Lighting Slider.safetensors", "lighting", 0.6),
            ("ZiTD3tailed4nime.safetensors", "anime_detail", 0.7)
        ]

        for filename, name, weight in lora_configs:
            path = os.path.join(self.weights_dir, filename)
            if os.path.exists(path):
                try:
                    print(f"Loading LoRA: {name}")
                    self.pipe.load_lora_weights(self.weights_dir, weight_name=filename, adapter_name=name)
                    active_adapters.append(name)
                    adapter_weights.append(weight)
                except Exception as e:
                    print(f"Failed to load LoRA {name}: {e}")
        
        if active_adapters:
            self.pipe.set_adapters(active_adapters, adapter_weights=adapter_weights)
            self.lora_loaded = True

    def predict(
        self,
        prompt: str = Input(default=""),
        negative_prompt: str = Input(default=None),
        width: int = Input(default=DEFAULT_WIDTH),
        height: int = Input(default=DEFAULT_HEIGHT),
        num_inference_steps: int = Input(default=DEFAULT_STEPS),
        guidance_scale: float = Input(default=DEFAULT_GUIDANCE),
        seed: int = Input(default=None),
        lora_scale: float = Input(default=1.0),
        progress_callback=None, 
    ) -> Path:

        if prompt:
            prompt = prompt.replace("+++", "").replace("---", "")
        
        print(f"[PROMPT]: {prompt[:50]}...")

        if not negative_prompt or negative_prompt.strip() == "":
            negative_prompt = DEFAULT_NEGATIVE_PROMPTS

        if seed is None or seed == -1:
            seed = random.randint(0, 2**32 - 1)
        print(f"Seed: {seed}")
        generator = torch.Generator(self.device).manual_seed(seed)

        def step_callback(pipe, step_index, timestep, callback_kwargs):
            if progress_callback is not None:
                current_step = step_index + 1
                percent = int((current_step / num_inference_steps) * 100)
                percent = min(percent, 99) 
                try:
                    progress_callback(percent)
                except Exception:
                    pass
            return callback_kwargs

        cross_attention_kwargs = {"scale": lora_scale} if self.lora_loaded else None

        try:
            with torch.inference_mode():
                # Compel processing
                if self.compel:
                    conditioning, pooled = self.compel(prompt)
                    neg_conditioning, neg_pooled = self.compel(negative_prompt)
                    
                    out = self.pipe(
                        prompt_embeds=conditioning,
                        pooled_prompt_embeds=pooled,
                        negative_prompt_embeds=neg_conditioning,
                        negative_pooled_prompt_embeds=neg_pooled,
                        width=width,
                        height=height,
                        num_inference_steps=num_inference_steps,
                        guidance_scale=guidance_scale,
                        generator=generator,
                        cross_attention_kwargs=cross_attention_kwargs,
                        callback_on_step_end=step_callback if progress_callback else None,
                        clip_skip=2  # <--- ВАЖНЕЙШАЯ НАСТРОЙКА ДЛЯ КАЧЕСТВА
                    )
                else:
                    # Fallback (вряд ли сработает с длинным промптом, но на всякий случай)
                    out = self.pipe(
                        prompt=prompt,
                        negative_prompt=negative_prompt,
                        width=width,
                        height=height,
                        num_inference_steps=num_inference_steps,
                        guidance_scale=guidance_scale,
                        generator=generator,
                        cross_attention_kwargs=cross_attention_kwargs,
                        callback_on_step_end=step_callback if progress_callback else None,
                        clip_skip=2 # <--- И ТУТ ТОЖЕ
                    )
                    
        except Exception as e:
            print("=== EXCEPTION ===")
            traceback.print_exc()
            raise RuntimeError(f"Generation failed: {e}")

        if not out.images:
            raise RuntimeError("No images returned.")

        out_path = "/tmp/output.png"
        out.images[0].save(out_path)
        print(f"Saved to {out_path}")

        return Path(out_path)