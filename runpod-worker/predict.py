from cog import BasePredictor, Input, Path
import torch
import os
import sys
import traceback
from diffusers import (
    StableDiffusionXLPipeline,
    DPMSolverMultistepScheduler
)
from compel import Compel, ReturnedEmbeddingsType

# === НАСТРОЙКИ ===
# Просто поменяй это имя файла для второго воркера!
MODEL_FILENAME = "perfectdeliberate_v50.safetensors" 
# Для второго воркера напишешь: "oneObsession_v18.safetensors"

DEFAULT_WIDTH = 832
DEFAULT_HEIGHT = 1216
DEFAULT_STEPS = 30
DEFAULT_GUIDANCE = 5.0

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
                safety_checker=None,
                requires_safety_checker=False
            )
            print("Model loaded.")
        except Exception as e:
            raise RuntimeError(f"Failed to load model: {e}")

        # 2. СЕМПЛЕР (DPM++ 2M Karras)
        self.pipe.scheduler = DPMSolverMultistepScheduler.from_config(
            self.pipe.scheduler.config,
            use_karras_sigmas=True,
            algorithm_type="dpmsolver++"
        )
        
        # 3. VAE FIX (Исправление цветов)
        self.pipe.to(self.device)
        if hasattr(self.pipe, "vae"):
            self.pipe.vae.to(dtype=torch.float32)
            try:
                orig_decode = self.pipe.vae.decode
                def decode_fp32(z, *args, **kwargs):
                    if isinstance(z, torch.Tensor):
                        z = z.to(dtype=torch.float32)
                    else:
                        try:
                            z = type(z)(elem.to(dtype=torch.float32) if isinstance(elem, torch.Tensor) else elem for elem in z)
                        except Exception:
                            pass
                    return orig_decode(z, *args, **kwargs)
                self.pipe.vae.decode = decode_fp32
            except Exception:
                pass

        # 4. Compel
        try:
            self.compel = Compel(
                tokenizer=[self.pipe.tokenizer, self.pipe.tokenizer_2],
                text_encoder=[self.pipe.text_encoder, self.pipe.text_encoder_2],
                returned_embeddings_type=ReturnedEmbeddingsType.PENULTIMATE_HIDDEN_STATES_NON_NORMALIZED,
                requires_pooled=[False, True]
            )
        except Exception as e:
            print(f"Warning: Compel initialization failed: {e}")
            self.compel = None

        # 5. Загрузка LORA (Они будут работать для обеих моделей)
        self._load_loras()
        print("Pipeline ready.")

    def _load_loras(self):
        active_adapters = []
        adapter_weights = []
        
        # Названия файлов LoRA и их веса
        lora_configs = [
            ("add-detail-xl.safetensors", "details", 0.8),
            ("sdxl_offset_example_v10.safetensors", "offset", 0.5),
            ("Dramatic Lighting Slider.safetensors", "lighting", 0.6)
        ]

        for filename, name, weight in lora_configs:
            path = os.path.join(self.weights_dir, filename)
            if os.path.exists(path):
                try:
                    self.pipe.load_lora_weights(self.weights_dir, weight_name=filename, adapter_name=name)
                    active_adapters.append(name)
                    adapter_weights.append(weight)
                    print(f"Loaded LoRA: {name}")
                except Exception as e:
                    print(f"Failed to load LoRA {name}: {e}")

        if active_adapters:
            self.pipe.set_adapters(active_adapters, adapter_weights=adapter_weights)
            self.lora_loaded = True
        else:
            self.lora_loaded = False

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
            prompt = prompt.replace("\\(", "(").replace("\\)", ")")
        
        print(f"[PROMPT]: {prompt}...")

        if not negative_prompt or negative_prompt.strip() == "":
            negative_prompt = DEFAULT_NEGATIVE_PROMPTS

        if seed is None or seed == -1:
            seed = int.from_bytes(os.urandom(4), "big")

        print(f"Seed: {seed}")
        generator = torch.Generator(self.device).manual_seed(seed)

        # Обратный вызов прогресса
        def step_callback(pipe, step_index, timestep, callback_kwargs):
            if progress_callback is not None:
                current_step = step_index + 1
                percent = int((current_step / num_inference_steps) * 100)
                percent = min(percent, 100)
                try:
                    progress_callback(percent)
                except Exception:
                    pass
            return callback_kwargs

        cross_attention_kwargs = {"scale": lora_scale} if self.lora_loaded else None

        try:
            with torch.inference_mode():
                if self.compel:
                    conditioning, pooled = self.compel(prompt)
                    negative_conditioning, negative_pooled = self.compel(negative_prompt)
                    
                    out = self.pipe(
                        prompt_embeds=conditioning,
                        pooled_prompt_embeds=pooled,
                        negative_prompt_embeds=negative_conditioning,
                        negative_pooled_prompt_embeds=negative_pooled,
                        width=width,
                        height=height,
                        num_inference_steps=num_inference_steps,
                        guidance_scale=guidance_scale,
                        generator=generator,
                        cross_attention_kwargs=cross_attention_kwargs,
                        callback_on_step_end=step_callback if progress_callback else None,
                    )
                else:
                    out = self.pipe(
                        prompt=prompt,
                        negative_prompt=negative_prompt,
                        width=width,
                        height=height,
                        num_inference_steps=num_inference_steps,
                        guidance_scale=guidance_scale,
                        generator=generator,
                        cross_attention_kwargs=cross_attention_kwargs,
                        clip_skip=2,
                        callback_on_step_end=step_callback if progress_callback else None,
                    )
        except Exception as e:
            print("=== EXCEPTION DURING GENERATION ===")
            traceback.print_exc()
            raise RuntimeError(f"Generation failed: {e}")

        if not out.images:
            raise RuntimeError("Pipeline returned no images.")

        out_path = "/tmp/output.png"
        out.images[0].save(out_path)
        print(f"Saved to {out_path}")

        return Path(out_path)