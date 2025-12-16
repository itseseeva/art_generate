import runpod
from predict import Predictor
import base64
import os
import traceback
import uuid
from dotenv import load_dotenv

load_dotenv()

# S3 Configuration
YANDEX_BUCKET_NAME = os.getenv("YANDEX_BUCKET_NAME", "jfpohpdofnhd")
YANDEX_ACCESS_KEY = os.getenv("YANDEX_ACCESS_KEY", "")
YANDEX_SECRET_KEY = os.getenv("YANDEX_SECRET_KEY", "")
YANDEX_ENDPOINT_URL = os.getenv("YANDEX_ENDPOINT_URL", "https://storage.yandexcloud.net")

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

def upload_to_s3(file_path: str) -> str:
    if not YANDEX_ACCESS_KEY or not YANDEX_SECRET_KEY:
        raise ValueError("S3 credentials not configured.")
    
    file_ext = os.path.splitext(file_path)[1] or ".png"
    unique_name = f"generated/{uuid.uuid4().hex}{file_ext}"
    
    try:
        s3 = get_s3_client()
        content_type = "image/png" if file_ext.lower() == ".png" else "image/jpeg"
        s3.upload_file(
            file_path,
            YANDEX_BUCKET_NAME,
            unique_name,
            ExtraArgs={"ContentType": content_type, "ACL": "public-read"}
        )
        public_url = f"{YANDEX_ENDPOINT_URL}/{YANDEX_BUCKET_NAME}/{unique_name}"
        return public_url
    except Exception as e:
        print(f"ERROR | Failed to upload to S3: {e}")
        raise

print("RunPod Worker Starting...")

_predictor = None

def get_predictor():
    global _predictor
    if _predictor is None:
        print("Loading model for the first time...")
        _predictor = Predictor()
        _predictor.setup()
        print("Model loaded.")
    return _predictor

def image_to_base64(image_path: str) -> str:
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image file not found: {image_path}")
    with open(image_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")

def _is_running_locally() -> bool:
    return os.environ.get("RUNPOD_WEBHOOK_GET_JOB") in (None, "")

def clean_prompt(prompt: str) -> str:
    if not prompt: return prompt
    import re
    cleaned = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\u200B-\u200D\uFEFF]', '', prompt)
    return re.sub(r' +', ' ', cleaned).strip()

def handler(job):
    print(f"INFO | Received job: {job.get('id', 'no-id')}")
    job_input = job.get("input", {}) or {}

    try:
        prompt = job_input.get("prompt", "masterpiece, best quality, girl")
        negative_prompt = job_input.get("negative_prompt", None)
        
        prompt = clean_prompt(prompt) if prompt else prompt
        negative_prompt = clean_prompt(negative_prompt) if negative_prompt else negative_prompt
        
        width = int(job_input.get("width", 832))
        height = int(job_input.get("height", 1216))
        steps = int(job_input.get("num_inference_steps", 30))
        guidance = float(job_input.get("guidance_scale", 4.0))
        lora_scale = float(job_input.get("lora_scale", 0.5))
        seed = job_input.get("seed")
        if seed is not None:
            seed = int(seed)
    except Exception as e:
        return {"error": f"Invalid input parameter types: {e}"}

    return_type = job_input.get("return_type", job_input.get("returnType", "url"))
    return_type = str(return_type).lower()
    
    if os.environ.get("RETURN_RAW_FILE", "0") in ("1", "true", "yes"):
        return_type = "file"

    output_path = None
    s3_uploaded = False
    
    try:
        import time
        generation_start_time = time.time()
        
        print("INFO | Getting predictor...")
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
                print(f"WARNING | Failed to update progress: {e}")

        print("INFO | Generating image...")
        output_path = model.predict(
            prompt=prompt,
            negative_prompt=negative_prompt,
            width=width,
            height=height,
            num_inference_steps=steps,
            guidance_scale=guidance,
            seed=seed,
            lora_scale=lora_scale,
            progress_callback=update_progress
        )
        
        generation_time = time.time() - generation_start_time
        print(f"INFO | Generation completed in {generation_time:.2f} seconds")

        resp = {
            "width": width, 
            "height": height, 
            "seed": seed,
            "generation_time": round(generation_time, 2)
        }

        if return_type == "url":
            try:
                image_url = upload_to_s3(output_path)
                resp["image_url"] = image_url
                s3_uploaded = True
                print("INFO | Job completed successfully (S3 URL).")
                return resp
            except Exception as s3_err:
                print(f"WARNING | S3 upload failed: {s3_err}. Falling back to base64.")
                raw_b64 = image_to_base64(output_path)
                resp["image"] = f"data:image/png;base64,{raw_b64}"
                resp["s3_error"] = str(s3_err)
                return resp

        if return_type in ("file", "both"):
            resp["file"] = str(output_path)
            if not _is_running_locally():
                resp["note"] = "Worker returned internal file path."

        if return_type in ("base64", "both"):
            raw_b64 = image_to_base64(output_path)
            resp["image"] = f"data:image/png;base64,{raw_b64}"

        if return_type not in ("file", "base64", "both", "url"):
            try:
                image_url = upload_to_s3(output_path)
                resp["image_url"] = image_url
                s3_uploaded = True
            except Exception:
                raw_b64 = image_to_base64(output_path)
                resp["image"] = f"data:image/png;base64,{raw_b64}"
                resp["file"] = str(output_path)
        
        print("INFO | Job completed successfully.")
        return resp

    except Exception as e:
        print(f"!!! JOB FAILED: {e}")
        traceback.print_exc()
        return {"error": str(e)}

    finally:
        try:
            keep_local = _is_running_locally()
            should_keep = keep_local and return_type == "file" and not s3_uploaded
            if not should_keep:
                if output_path and os.path.exists(output_path):
                    os.remove(output_path)
                    print("INFO | Local file cleaned up.")
        except Exception:
            pass

if __name__ == "__main__":
    runpod.serverless.start({"handler": handler})