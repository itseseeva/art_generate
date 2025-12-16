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

# Дефолтные настройки
DEFAULT_WIDTH = 832
DEFAULT_HEIGHT = 1216
DEFAULT_STEPS = 30
DEFAULT_GUIDANCE = 5.0

# Позитивные "улучшайзеры" (Оставлены, но отключены в логике, чтобы не портить чистый промпт)
DEFAULT_POSITIVE_SUFFIX = "Clean lines, Perfect hands, Detailed realistic hair, Detailed realistic face, Detailed realistic body, Detailed realistic hands, Detailed realistic feet, Detailed realistic legs, Detailed realistic eyes, Realistic lighting, beautiful iris, symmetrical face, Cinematic lighting, Hi-Res, Best quality, Semi-Realistic, Photorealistic, Highly aesthetic, Depth of field"

# Дефолтные негативные промпты
DEFAULT_NEGATIVE_PROMPTS = "poorly_detailed, worst_quality, bad_quality, extra fingers, missing fingers, lowres, bad anatomy, extra digits, jpeg artifacts, signature, watermark, username, conjoined, deformed fingers, short legs, body disproportion, bad ai-generated, text, halo, multiple views, displeasing, messy composition, clones"


class Predictor(BasePredictor):
    def setup(self):
        print(f"PYTHON VERSION: {sys.version}")
        model_path = "/src/weights/oneObsession_v18.safetensors"
        weights_dir = "/src/weights"
        
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
        print("Scheduler set to: DPM++ 2M Karras (Optimized for Realism)")
        
        # 3. VAE FIX (Исправление цветов)
        self.pipe.to(self.device)
        if hasattr(self.pipe, "vae"):
            self.pipe.vae.to(dtype=torch.float32)
            # Патч для декодирования
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

        # 4. CLIP SKIP 2 (Через Compel)
        try:
            print("Initializing Compel with CLIP Skip 2 support...")
            self.compel = Compel(
                tokenizer=[self.pipe.tokenizer, self.pipe.tokenizer_2],
                text_encoder=[self.pipe.text_encoder, self.pipe.text_encoder_2],
                returned_embeddings_type=ReturnedEmbeddingsType.PENULTIMATE_HIDDEN_STATES_NON_NORMALIZED,
                requires_pooled=[False, True]
            )
        except Exception as e:
            print(f"Warning: Compel initialization failed: {e}")
            self.compel = None

        # ==========================================
        # 5. ПРОФЕССИОНАЛЬНАЯ ЗАГРУЗКА LORA (FUSED)
        # ==========================================
        active_adapters = []
        adapter_weights = []

        # --- LoRA 1: Add Detail XL (Детализация) ---
        detail_path = os.path.join(weights_dir, "add-detail-xl.safetensors")
        if os.path.exists(detail_path):
            try:
                print("Loading LoRA: Add Detail...")
                self.pipe.load_lora_weights(weights_dir, weight_name="add-detail-xl.safetensors", adapter_name="details")
                active_adapters.append("details")
                adapter_weights.append(0.8) # Вес 0.8 - оптимально для четкости
            except Exception as e:
                print(f"❌ Failed to load Detail LoRA: {e}")

        # --- LoRA 2: Offset Noise (Глубокие тени) ---
        offset_path = os.path.join(weights_dir, "sdxl_offset_example_v10.safetensors")
        if os.path.exists(offset_path):
            try:
                print("Loading LoRA: Offset Noise...")
                self.pipe.load_lora_weights(weights_dir, weight_name="sdxl_offset_example_v10.safetensors", adapter_name="offset")
                active_adapters.append("offset")
                adapter_weights.append(0.5) # Вес 0.5 - стандарт
            except Exception as e:
                print(f"❌ Failed to load Offset LoRA: {e}")

        # --- LoRA 3: Dramatic Lighting (Объемный свет) ---
        light_path = os.path.join(weights_dir, "Dramatic Lighting Slider.safetensors")
        if os.path.exists(light_path):
            try:
                print("Loading LoRA: Dramatic Lighting...")
                self.pipe.load_lora_weights(weights_dir, weight_name="Dramatic Lighting Slider.safetensors", adapter_name="lighting")
                active_adapters.append("lighting")
                adapter_weights.append(0.6) # Вес 0.6 - мягкий объем
            except Exception as e:
                print(f"❌ Failed to load Lighting LoRA: {e}")

        # Активируем все найденные LoRA с их весами
        if active_adapters:
            print(f"✅ Activating LoRAs: {active_adapters} with weights {adapter_weights}")
            self.pipe.set_adapters(active_adapters, adapter_weights=adapter_weights)
            self.lora_loaded = True
        else:
            print("⚠️ No LoRAs loaded.")
            self.lora_loaded = False

        print("Pipeline ready.")

    def predict(
        self,
        prompt: str = Input(default=""),
        negative_prompt: str = Input(default=None),
        width: int = Input(default=DEFAULT_WIDTH),
        height: int = Input(default=DEFAULT_HEIGHT),
        num_inference_steps: int = Input(default=DEFAULT_STEPS),
        guidance_scale: float = Input(default=DEFAULT_GUIDANCE),
        seed: int = Input(default=None),
        lora_scale: float = Input(default=1.0, description="Global multiplier for all LoRAs"),
        progress_callback=None,  # Optional callback function(percent: int) -> None
    ) -> Path:

        # === ФИКС 1: ОЧИСТКА ПРОМПТА ОТ МУСОРА ===
        if prompt:
            prompt = prompt.replace("\\(", "(").replace("\\)", ")")
        
        print(f"[CLEANED PROMPT]: {prompt}...")

        # === ФИКС 3: НЕГАТИВНЫЙ ПРОМПТ ===
        if not negative_prompt or negative_prompt.strip() == "":
            negative_prompt = DEFAULT_NEGATIVE_PROMPTS
            print(f"[PROMPT] Using default negative prompt")

        # Seed
        if seed is None or seed == -1:
            seed = int.from_bytes(os.urandom(4), "big")

        print(f"Seed: {seed}")
        generator = torch.Generator(self.device).manual_seed(seed)

        # LoRA Scale (Глобальный множитель)
        # Если юзер передаст lora_scale=0.5, то веса всех лор (0.8, 0.5, 0.6) умножатся на 0.5
        # Оставьте 1.0, чтобы использовать настройки из setup()
        cross_attention_kwargs = {"scale": lora_scale} if self.lora_loaded else None

        # Callback для отслеживания прогресса
        def step_callback(pipe, step_index, timestep, callback_kwargs):
            """
            Callback функция, вызываемая на каждом шаге генерации.
            Вычисляет процент завершения и вызывает progress_callback, если он передан.
            
            Args:
                pipe: Pipeline объект
                step_index: Индекс текущего шага (начинается с 0)
                timestep: Текущий timestep
                callback_kwargs: Дополнительные аргументы callback
            """
            if progress_callback is not None:
                # Вычисляем процент завершения (от 0 до 100)
                # step_index начинается с 0, поэтому добавляем 1 для расчета процента
                current_step = step_index + 1
                percent = int((current_step / num_inference_steps) * 100)
                # Ограничиваем до 100%, чтобы не превысить максимум
                percent = min(percent, 100)
                try:
                    progress_callback(percent)
                except Exception as e:
                    # Не прерываем генерацию, если callback вызвал ошибку
                    print(f"Warning: Progress callback error: {e}")
            return callback_kwargs

        # Генерация
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
                    # Fallback
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