import runpod
from predict import Predictor
import base64
import os
import traceback
import uuid
from dotenv import load_dotenv

load_dotenv()

# S3 Configuration (Yandex Cloud — такой же как в остальных workers)
YANDEX_BUCKET_NAME   = os.getenv("YANDEX_BUCKET_NAME", "jfpohpdofnhd")
YANDEX_ACCESS_KEY    = os.getenv("YANDEX_ACCESS_KEY", "")
YANDEX_SECRET_KEY    = os.getenv("YANDEX_SECRET_KEY", "")
YANDEX_ENDPOINT_URL  = os.getenv("YANDEX_ENDPOINT_URL", "https://storage.yandexcloud.net")

_s3_client = None

def get_s3_client():
    global _s3_client
    if _s3_client is None:
        import boto3
        _s3_client = boto3.client(
            "s3",
            endpoint_url=YANDEX_ENDPOINT_URL,
            aws_access_key_id=YANDEX_ACCESS_KEY,
            aws_secret_access_key=YANDEX_SECRET_KEY,
        )
    return _s3_client

def upload_video_to_s3(file_path: str) -> str:
    """Загружает MP4 видео в Yandex S3 и возвращает публичный URL"""
    if not YANDEX_ACCESS_KEY or not YANDEX_SECRET_KEY:
        raise ValueError("S3 credentials not configured.")

    unique_name = f"animated/{uuid.uuid4().hex}.mp4"

    try:
        s3 = get_s3_client()
        s3.upload_file(
            file_path,
            YANDEX_BUCKET_NAME,
            unique_name,
            ExtraArgs={"ContentType": "video/mp4", "ACL": "public-read"}
        )
        public_url = f"{YANDEX_ENDPOINT_URL}/{YANDEX_BUCKET_NAME}/{unique_name}"
        return public_url
    except Exception as e:
        print(f"ERROR | Failed to upload video to S3: {e}")
        raise

def video_to_base64(file_path: str) -> str:
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Video file not found: {file_path}")
    with open(file_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")

def _is_running_locally() -> bool:
    return os.environ.get("RUNPOD_WEBHOOK_GET_JOB") in (None, "")

print("=== Wan2.1 I2V RunPod Worker Starting ===")

_predictor = None

def get_predictor():
    global _predictor
    if _predictor is None:
        print("Loading Wan2.1 I2V model for the first time...")
        _predictor = Predictor()
        _predictor.setup()
        print("Model loaded and ready.")
    return _predictor

def handler(job):
    print(f"INFO | Received job: {job.get('id', 'no-id')}")
    job_input = job.get("input", {}) or {}

    # --- Парсим входные параметры ---
    try:
        image       = job_input.get("image")           # ОБЯЗАТЕЛЬНО: base64 или URL
        prompt      = job_input.get("prompt", "cinematic motion, smooth animation, high quality")
        neg_prompt  = job_input.get("negative_prompt", "")
        width       = int(job_input.get("width", 832))
        height      = int(job_input.get("height", 480))
        num_frames  = int(job_input.get("num_frames", 81))   # 81 = ~5 сек
        steps       = int(job_input.get("num_inference_steps", 20))
        guidance    = float(job_input.get("guidance_scale", 5.0))
        lora_scale  = float(job_input.get("lora_scale", 0.7))
        seed        = job_input.get("seed")
        fps         = int(job_input.get("fps", 16))
        if seed is not None:
            seed = int(seed)
    except Exception as e:
        return {"error": f"Invalid input parameters: {e}"}

    if not image:
        return {"error": "Missing required parameter: 'image' (base64 or URL)"}

    return_type = str(job_input.get("return_type", "url")).lower()

    output_path = None
    s3_uploaded = False

    try:
        import time
        start_time = time.time()

        model = get_predictor()

        def update_progress(percent: int):
            try:
                if hasattr(runpod.serverless, 'progress_update'):
                    runpod.serverless.progress_update(job, f"{percent}%")
                else:
                    try:
                        from runpod.serverless.modules.rp_progress import progress_update
                        progress_update(job, f"{percent}%")
                    except ImportError:
                        pass
                print(f"INFO | Progress: {percent}%")
            except Exception as e:
                print(f"WARNING | Progress update failed: {e}")

        print("INFO | Starting video generation...")
        output_path = model.predict(
            image=image,
            prompt=prompt,
            negative_prompt=neg_prompt,
            width=width,
            height=height,
            num_frames=num_frames,
            num_inference_steps=steps,
            guidance_scale=guidance,
            seed=seed,
            lora_scale=lora_scale,
            fps=fps,
            progress_callback=update_progress,
        )

        gen_time = time.time() - start_time
        print(f"INFO | Generation completed in {gen_time:.2f} seconds")

        resp = {
            "width": width,
            "height": height,
            "num_frames": num_frames,
            "fps": fps,
            "seed": seed,
            "generation_time": round(gen_time, 2),
        }

        # --- Возврат результата ---
        if return_type == "url":
            try:
                video_url = upload_video_to_s3(output_path)
                resp["video_url"] = video_url
                s3_uploaded = True
                print("INFO | Job completed successfully (S3 URL).")
                return resp
            except Exception as s3_err:
                print(f"WARNING | S3 upload failed: {s3_err}. Falling back to base64.")
                b64 = video_to_base64(output_path)
                resp["video"] = f"data:video/mp4;base64,{b64}"
                resp["s3_error"] = str(s3_err)
                return resp

        elif return_type == "base64":
            b64 = video_to_base64(output_path)
            resp["video"] = f"data:video/mp4;base64,{b64}"
            return resp

        elif return_type == "file":
            resp["file"] = output_path
            return resp

        else:
            # По умолчанию — URL
            try:
                video_url = upload_video_to_s3(output_path)
                resp["video_url"] = video_url
                s3_uploaded = True
            except Exception:
                b64 = video_to_base64(output_path)
                resp["video"] = f"data:video/mp4;base64,{b64}"
            return resp

    except Exception as e:
        print(f"!!! JOB FAILED: {e}")
        traceback.print_exc()
        return {"error": str(e)}

    finally:
        # Удаляем временный файл
        try:
            keep_local = _is_running_locally()
            should_keep = keep_local and return_type == "file" and not s3_uploaded
            if not should_keep:
                if output_path and os.path.exists(output_path):
                    os.remove(output_path)
                    print("INFO | Temp video file cleaned up.")
        except Exception:
            pass


if __name__ == "__main__":
    runpod.serverless.start({"handler": handler})
