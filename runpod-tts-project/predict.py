import os
import torch
import torchaudio

# В версии 1.5.0 импорты изменились!
try:
    from fish_speech.inference.text2semantic import TransformerModel
    from fish_speech.inference.vqgan import VQGANModel
    from fish_speech.utils.schema import ServeReferenceAudio, ServeTTSRequest
    print("--- Fish Speech v1.5.0 modules imported successfully ---")
except ImportError as e:
    print(f"--- Critical Import Error: {e} ---")
    print("Check if the version in Dockerfile is actually 1.5.0")
    raise

class FishPredictor:
    def setup(self):
        print("--- Loading Fish Speech 1.5 Weights ---")
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        checkpoint_dir = "/src/weights/v1.5"
        
        if not os.path.exists(checkpoint_dir):
            raise FileNotFoundError(f"Weights not found at: {checkpoint_dir}")

        # Загрузка Text2Semantic (Llama)
        self.text2semantic = TransformerModel(
            model_path=os.path.join(checkpoint_dir, "model.pth"),
            device=self.device,
            precision="bf16" if torch.cuda.is_bf16_supported() else "fp16"
        )
        
        # Загрузка VQGAN (Firefly)
        self.vqgan = VQGANModel(
            model_path=os.path.join(checkpoint_dir, "firefly-gan-vq-fsq-8x1024-21hz-generator.pth"),
            device=self.device
        )
        print("--- All Systems Go! (v1.5.0) ---")

    def predict(self, text, ref_audio_path, output_path="/tmp/output.wav"):
        with open(ref_audio_path, "rb") as f:
            ref_audio_data = f.read()

        request = ServeTTSRequest(
            text=text,
            references=[ServeReferenceAudio(audio=ref_audio_data, text="")]
        )

        with torch.no_grad():
            # Генерируем коды и декодируем в аудио
            codes = self.text2semantic.generate(request)
            audio = self.vqgan.decode(codes)
            
        torchaudio.save(output_path, audio.cpu(), 44100)
        return output_path