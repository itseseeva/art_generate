import os
import sys
import torch
import torchaudio

# Принудительно добавляем путь, чтобы Python видел папку inference
sys.path.append("/opt/fish-speech")

try:
    # Прямой импорт из структуры v1.5.0
    from tools.llama.generate import TransformerModel
    from tools.vits.generate import VQGANModel
    from fish_speech.utils.schema import ServeReferenceAudio, ServeTTSRequest
    print("--- Fish Speech v1.5.0 modules imported ---")
except ImportError:
    # Запасной вариант, если структура иная
    from fish_speech.models.text2semantic.inference import Text2SemanticInference as TransformerModel
    from fish_speech.models.vqgan.inference import VQGANInference as VQGANModel
    from fish_speech.utils.schema import ServeReferenceAudio, ServeTTSRequest

class FishPredictor:
    def setup(self):
        print("--- Loading Fish Speech 1.5 Weights ---")
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        checkpoint_dir = "/src/weights/v1.5"
        
        if not os.path.exists(checkpoint_dir):
            raise FileNotFoundError(f"Weights not found at: {checkpoint_dir}")

        # Инициализация моделей (пути к весам остаются прежними)
        self.text2semantic = TransformerModel(
            model_path=os.path.join(checkpoint_dir, "model.pth"),
            device=self.device
        )
        self.vqgan = VQGANModel(
            model_path=os.path.join(checkpoint_dir, "firefly-gan-vq-fsq-8x1024-21hz-generator.pth"),
            device=self.device
        )
        print("--- All Systems Go! ---")

    def predict(self, text, ref_audio_path, output_path="/tmp/output.wav"):
        with open(ref_audio_path, "rb") as f:
            ref_audio_data = f.read()

        request = ServeTTSRequest(
            text=text,
            references=[ServeReferenceAudio(audio=ref_audio_data, text="")]
        )

        with torch.no_grad():
            codes = self.text2semantic.generate(request)
            audio = self.vqgan.decode(codes)
            
        torchaudio.save(output_path, audio.cpu(), 44100)
        return output_path