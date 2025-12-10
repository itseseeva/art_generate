from cog import BasePredictor, Input, Path
from diffusers import StableDiffusionPipeline
import torch
import sys

# Дефолтные промпты из default_prompts.py
DEFAULT_POSITIVE_PROMPTS = [
    "Clean lines",
    "Perfect hands",
    "Detailed realistic hair",
    "Detailed realistic face",
    "Detailed realistic body",
    "Detailed realistic hands",
    "Detailed realistic feet",
    "Detailed realistic legs",
    "Detailed realistic boobs",
    "Detailed realistic eyes",
    "Realistic lighting",
    "beautiful iris",
    "symmetrical face",
    "Cinematic lighting",
    "Hi-Res",
    "Best quality",
    "Semi-Realistic",
    "Lazypos",
    "Photorealistic",
    "Realistic Tint",
    "Highly aesthetic",
    "Depth of field",
    "High-Res",
    "Newst-ai"
]

DEFAULT_NEGATIVE_PROMPTS = [
    'poorly_detailed',
    'worst_quality',
    'bad_quality',
    'extra fingers',
    'missing fingers',
    'lowres',
    'low resolution bad anatomy',
    'extra digits',
    'jpeg artifacts',
    'signature',
    'watermark',
    'username',
    'conjoined',
    'deformed fingers',
    'short legs',
    'body diproportion',
    'bad ai-generated',
    'text',
    'halo',
    'multiple views',
    'displeasing',
    'messy composition',
    'clones'
]


def get_default_positive_prompts() -> str:
    """Возвращает строку с дефолтными позитивными промптами"""
    return ", ".join(DEFAULT_POSITIVE_PROMPTS)


def get_default_negative_prompts() -> str:
    """Возвращает строку с дефолтными негативными промптами"""
    return ", ".join(DEFAULT_NEGATIVE_PROMPTS)


def combine_prompts(user_prompt: str, default_positive: str) -> str:
    """
    Объединяет промпт пользователя с дефолтными промптами.
    Порядок: промпт пользователя → дефолтные промпты
    """
    if not user_prompt:
        return default_positive

    if not default_positive:
        return user_prompt

    # Промпт пользователя идет первым, затем дефолтные промпты
    return f"{user_prompt}, {default_positive}"


class Predictor(BasePredictor):
    def setup(self):
        print(f"🔴 PYTHON VERSION: {sys.version}")
        """Загрузка модели для Replicate (GPU)"""
        self.pipe = StableDiffusionPipeline.from_single_file(
            "./weights/oneObsession_v18.safetensors",
            torch_dtype=torch.float16,  # Возвращаем float16 для скорости
            load_safety_checker=False   # Отключаем лишнюю загрузку
        )
        self.pipe.to("cuda")            # Возвращаем на видеокарту

    def predict(
        self,
        prompt: str = Input(
            description="Input prompt",
            default="masterpiece, best quality, girl"
        ),
        negative_prompt: str = Input(
            description="Negative prompt",
            default=None
        ),
        width: int = Input(description="Width", default=832),
        height: int = Input(description="Height", default=1216),
        num_inference_steps: int = Input(description="Steps", default=30),
        guidance_scale: float = Input(description="CFG Scale", default=7.0),
        seed: int = Input(description="Seed", default=None),
    ) -> Path:
        """
        Генерация изображения с автоматическим добавлением дефолтных промптов.
        Порядок: промпт пользователя → дефолтные промпты
        """
        # Получаем дефолтные промпты
        default_positive = get_default_positive_prompts()
        default_negative = get_default_negative_prompts()

        # Объединяем промпт пользователя с дефолтными промптами
        # Порядок: промпт пользователя → дефолтные промпты
        if prompt:
            final_prompt = combine_prompts(prompt, default_positive)
        else:
            final_prompt = default_positive

        # Объединяем негативный промпт
        if negative_prompt:
            # Если есть пользовательский негативный промпт,
            # объединяем с дефолтным
            final_negative_prompt = f"{negative_prompt}, {default_negative}"
        else:
            # Если нет пользовательского, используем только дефолтный
            final_negative_prompt = default_negative

        print(f"[PROMPT] Исходный промпт: {prompt[:100]}...")
        print(f"[PROMPT] Финальный промпт: {final_prompt[:150]}...")
        print(
            f"[PROMPT] Финальный негативный промпт: "
            f"{final_negative_prompt[:150]}..."
        )

        if seed is None:
            seed = int.from_bytes(torch.os.urandom(2), "big")
        print(f"Generating with seed: {seed}")

        generator = torch.Generator("cuda").manual_seed(seed)

        output = self.pipe(
            prompt=final_prompt,
            negative_prompt=final_negative_prompt,
            width=width,
            height=height,
            num_inference_steps=num_inference_steps,
            guidance_scale=guidance_scale,
            generator=generator
        )

        out_path = Path("/tmp/output.png")
        output.images[0].save(out_path)
        return out_path
