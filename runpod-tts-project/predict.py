import os
import torch
import torchaudio

# Импорты для Fish Speech 1.5
try:
    from fish_speech.models.text2semantic.inference import load_model as load_text2semantic_model
    from fish_speech.models.vqgan.inference import load_model as load_vqgan_model
    from fish_speech.utils.schema import ServeReferenceAudio, ServeTTSRequest
    print("--- Fish Speech modules imported successfully ---")
except ImportError as e:
    print(f"--- Error importing Fish Speech modules: {e} ---")
    raise

class FishPredictor:
    """Обертка для работы с моделью Fish Speech v1.5"""
    
    def setup(self):
        """Загрузка моделей и весов"""
        print("--- Loading Fish Speech 1.5 Weights ---")
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        checkpoint_dir = "/src/weights/v1.5"
        
        # Проверяем наличие файлов (хотя бы tokenizer)
        if not os.path.exists(checkpoint_dir):
            print(f"Directory not found: {checkpoint_dir}")
            # Пытаемся найти в /src/weights если v1.5 нет
            if os.path.exists("/src/weights"):
                print(f"Available in /src/weights: {os.listdir('/src/weights')}")
            raise FileNotFoundError(f"Weights not found at: {checkpoint_dir}")

        # Загрузка Text2Semantic модели
        semantic_path = os.path.join(checkpoint_dir, "model.pth")
        if not os.path.exists(semantic_path):
            # Попробуем найти любой .pth файл если model.pth нет
            pth_files = [f for f in os.listdir(checkpoint_dir) if f.endswith('.pth')]
            if pth_files:
                semantic_path = os.path.join(checkpoint_dir, pth_files[0])
                print(f"Using found model file: {semantic_path}")

        self.text2semantic = load_text2semantic_model(
            checkpoint_path=semantic_path,
            device=self.device,
            precision="bf16" if torch.cuda.is_bf16_supported() else "fp16"
        )
        
        # Загрузка VQGAN (Firefly) модели
        vqgan_path = os.path.join(checkpoint_dir, "firefly-gan-vq-fsq-8x1024-21hz-generator.pth")
        if not os.path.exists(vqgan_path):
            # Ищем что-то похожее на gan или generator
            gan_files = [f for f in os.listdir(checkpoint_dir) if 'gan' in f.lower() or 'generator' in f.lower()]
            if gan_files:
                vqgan_path = os.path.join(checkpoint_dir, gan_files[0])
                print(f"Using found VQGAN file: {vqgan_path}")

        self.vqgan = load_vqgan_model(
            checkpoint_path=vqgan_path,
            device=self.device
        )
        print("--- All Systems Go! ---")

    def predict(self, text: str, ref_audio_path: str, output_path: str = "/tmp/output.wav") -> str:
        """
        Генерация речи по тексту и референсному аудио
        """
        print(f"Predicting for text: {text[:50]}...")
        
        with open(ref_audio_path, "rb") as f:
            ref_audio_data = f.read()

        request = ServeTTSRequest(
            text=text,
            references=[ServeReferenceAudio(audio=ref_audio_data, text="")]
        )

        with torch.no_grad():
            # Генерируем семантические коды
            codes_result = self.text2semantic.generate_codes(request)
            
            # Обработка результата (может быть генератором или тензором)
            if hasattr(codes_result, '__iter__') and not isinstance(codes_result, torch.Tensor):
                codes_list = list(codes_result)
                final_codes = torch.cat(codes_list, dim=1)
            else:
                final_codes = codes_result
            
            # Декодируем коды в аудио волну
            audio = self.vqgan.decode(final_codes)
            
        # Приводим к формату [Channels, Samples]
        if audio.ndim == 3:
            audio = audio.squeeze(0)
        if audio.ndim == 1:
            audio = audio.unsqueeze(0)
            
        torchaudio.save(output_path, audio.cpu(), 44100)
        return output_path
