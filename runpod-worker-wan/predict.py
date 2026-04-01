import torch
import os
import sys
import traceback
import random
import base64
import io
from PIL import Image

# === ПУТИ К ФАЙЛАМ МОДЕЛИ ===
WEIGHTS_DIR    = os.getenv("WEIGHTS_DIR", "/src/weights/wan_i2v")
HF_MODEL_ID    = "Wan-AI/Wan2.1-I2V-14B-480P-Diffusers"
LORA_DIR       = "/src/weights/loras"
LORA_FILENAME  = "Wan2.1_T2V_14B_FusionX_LoRA.safetensors"

# Параметры по умолчанию
DEFAULT_WIDTH   = 832
DEFAULT_HEIGHT  = 480
DEFAULT_FRAMES  = 81       # 4k+1: 81=~5сек, 49=~3сек при 16fps
DEFAULT_STEPS   = 20
DEFAULT_GUIDANCE = 5.0
DEFAULT_LORA_SCALE = 0.7


class Predictor:
    def setup(self):
        print(f"PYTHON VERSION: {sys.version}")
        print(f"PyTorch version: {torch.__version__}")
        print(f"CUDA available: {torch.cuda.is_available()}")

        if torch.cuda.is_available():
            print(f"GPU: {torch.cuda.get_device_name(0)}")
            vram = torch.cuda.get_device_properties(0).total_memory / 1e9
            print(f"VRAM: {vram:.1f} GB")

        self.device = "cuda" if torch.cuda.is_available() else "cpu"

        # Wan2.1 использует diffusers WanImageToVideoPipeline начиная с версии 0.31+
        from diffusers import WanImageToVideoPipeline
        from diffusers.utils import export_to_video
        self.export_to_video = export_to_video

        print("Loading Wan2.1 I2V pipeline...")
        
        # Проверяем, есть ли веса локально
        model_path = WEIGHTS_DIR
        if not os.path.exists(os.path.join(WEIGHTS_DIR, "model_index.json")):
            print(f"WARNING: model_index.json not found in {WEIGHTS_DIR}")
            print(f"Switching to Hugging Face fallback: {HF_MODEL_ID}")
            model_path = HF_MODEL_ID
        else:
            print(f"Loading from local weights: {WEIGHTS_DIR}")

        try:
            self.pipe = WanImageToVideoPipeline.from_pretrained(
                model_path,
                torch_dtype=torch.bfloat16,
                low_cpu_mem_usage=True,
            )
            print(f"Pipeline loaded successfully from {model_path}.")
        except Exception as e:
            print("Failed to load pipeline!")
            traceback.print_exc()
            raise RuntimeError(f"Failed to load pipeline: {e}")

        # CPU offload для экономии VRAM (работает с accelerate)
        print("Enabling model CPU offload...")
        self.pipe.enable_model_cpu_offload()

        # VAE оптимизации для длинных видео
        try:
            self.pipe.vae.enable_slicing()
            self.pipe.vae.enable_tiling()
            print("VAE slicing + tiling enabled.")
        except Exception as e:
            print(f"WARNING: VAE optimizations failed: {e}")

        # Загрузка LoRA
        self._load_lora()

        print("=== Wan2.1 I2V Predictor Ready ===")

    def _load_lora(self):
        self.lora_loaded = False
        lora_path = os.path.join(LORA_DIR, LORA_FILENAME)

        if not os.path.exists(lora_path):
            print(f"WARNING: LoRA not found at {lora_path}, skipping.")
            return

        try:
            print(f"Loading LoRA: {LORA_FILENAME}")
            self.pipe.load_lora_weights(
                LORA_DIR,
                weight_name=LORA_FILENAME,
                adapter_name="main_lora"
            )
            self.lora_loaded = True
            print("LoRA loaded successfully.")
        except Exception as e:
            print(f"WARNING: Failed to load LoRA: {e}")

    def _decode_image(self, image_input) -> Image.Image:
        """
        Принимает: base64 строку (с префиксом или без), URL или путь к файлу.
        Возвращает PIL Image в RGB.
        """
        if not isinstance(image_input, str):
             raise ValueError(f"Unsupported image input type: {type(image_input)}")

        # 1. Пробуем определить по префиксу
        if image_input.startswith("data:image"):
            _, data = image_input.split(",", 1)
            return Image.open(io.BytesIO(base64.b64decode(data))).convert("RGB")
        
        # 2. Пробуем определить по URL
        if image_input.startswith("http"):
            import urllib.request
            with urllib.request.urlopen(image_input) as r:
                return Image.open(io.BytesIO(r.read())).convert("RGB")
        
        # 3. Пробуем декодировать как "чистый" base64
        # Если это путь к файлу, он упадет на декодировании или будет коротким.
        # Обычно base64 изображения очень длинный.
        if len(image_input) > 255: # Пути к файлам редко бывают длиннее 255 символов
            try:
                return Image.open(io.BytesIO(base64.b64decode(image_input))).convert("RGB")
            except Exception:
                pass # Если не вышло, пробуем как путь
        
        # 4. Последний шанс: путь к файлу
        if os.path.exists(image_input):
            return Image.open(image_input).convert("RGB")
            
        raise ValueError(f"Could not decode image input. String length: {len(image_input)}")

    def predict(
        self,
        image,
        prompt: str = "",
        negative_prompt: str = "",
        width: int = DEFAULT_WIDTH,
        height: int = DEFAULT_HEIGHT,
        num_frames: int = DEFAULT_FRAMES,
        num_inference_steps: int = DEFAULT_STEPS,
        guidance_scale: float = DEFAULT_GUIDANCE,
        seed: int = None,
        lora_scale: float = DEFAULT_LORA_SCALE,
        fps: int = 16,
        progress_callback=None,
    ) -> str:
        """Генерирует видео из фото. Возвращает путь к MP4."""

        # Декодируем входное изображение
        print("Decoding input image...")
        input_image = self._decode_image(image)
        input_image = input_image.resize((width, height), Image.LANCZOS)
        print(f"Image resized to: {input_image.size}")

        # Промпты
        if not prompt:
            prompt = "cinematic motion, smooth animation, high quality video, natural movement"
        if not negative_prompt:
            negative_prompt = (
                "low quality, worst quality, blurry, static image, "
                "no motion, watermark, text"
            )

        # Seed
        if seed is None or seed == -1:
            seed = random.randint(0, 2**32 - 1)
        print(f"Seed: {seed}")
        generator = torch.Generator(device="cpu").manual_seed(seed)

        # LoRA scale
        cross_attention_kwargs = {"scale": lora_scale} if self.lora_loaded else None

        # num_frames должен быть 4k+1 (25, 49, 81, 121...)
        num_frames = max(1, ((num_frames - 1) // 4) * 4 + 1)
        print(f"Generating: {width}x{height}, {num_frames} frames, {num_inference_steps} steps")

        def step_callback(pipe, step_index, timestep, callback_kwargs):
            if progress_callback:
                percent = min(int(((step_index + 1) / num_inference_steps) * 100), 99)
                try:
                    progress_callback(percent)
                except Exception:
                    pass
            return callback_kwargs

        try:
            with torch.inference_mode():
                output = self.pipe(
                    image=input_image,
                    prompt=prompt,
                    negative_prompt=negative_prompt,
                    height=height,
                    width=width,
                    num_frames=num_frames,
                    num_inference_steps=num_inference_steps,
                    guidance_scale=guidance_scale,
                    generator=generator,
                    cross_attention_kwargs=cross_attention_kwargs,
                    callback_on_step_end=step_callback if progress_callback else None,
                )
        except Exception as e:
            print("=== GENERATION EXCEPTION ===")
            traceback.print_exc()
            raise RuntimeError(f"Video generation failed: {e}")

        out_path = "/tmp/output_video.mp4"
        print("Exporting to MP4...")
        self.export_to_video(output.frames[0], out_path, fps=fps)

        size_mb = os.path.getsize(out_path) / (1024 * 1024)
        print(f"Video saved: {out_path} ({size_mb:.1f} MB)")

        return out_path
