import sys
import time
from pathlib import Path

import modules.shared as shared
from modules.logging_colors import logger
from modules.models_settings import get_model_metadata

last_generation_time = time.time()


def load_model(model_name, loader=None):
    logger.info(f"Loading \"{model_name}\"")
    t0 = time.time()

    shared.is_seq2seq = False
    shared.model_name = model_name
    load_func_map = {
        'llama.cpp': llama_cpp_server_loader,
        'Transformers': transformers_loader,
        'ExLlamav3_HF': ExLlamav3_HF_loader,
        'ExLlamav2_HF': ExLlamav2_HF_loader,
        'ExLlamav2': ExLlamav2_loader,
        'TensorRT-LLM': TensorRT_LLM_loader,
    }

    metadata = get_model_metadata(model_name)
    if loader is None:
        if shared.args.loader is not None:
            loader = shared.args.loader
        else:
            loader = metadata['loader']
            if loader is None:
                logger.error('The path to the model does not exist. Exiting.')
                raise ValueError

    if loader != 'llama.cpp' and 'sampler_hijack' not in sys.modules:
        from modules import sampler_hijack
        sampler_hijack.hijack_samplers()

    shared.args.loader = loader
    
    try:
        output = load_func_map[loader](model_name)
        if output is None:
            logger.error(f"Failed to load model '{model_name}' with loader '{loader}'")
            return None, None
            
        if type(output) is tuple:
            model, tokenizer = output
        else:
            model = output
            if model is None:
                return None, None
            else:
                from modules.transformers_loader import load_tokenizer
                tokenizer = load_tokenizer(model_name)
    except Exception as e:
        logger.error(f"Error loading model '{model_name}' with loader '{loader}': {str(e)}")
        raise

    shared.settings.update({k: v for k, v in metadata.items() if k in shared.settings})
    if loader.lower().startswith('exllama') or loader.lower().startswith('tensorrt') or loader == 'llama.cpp':
        shared.settings['truncation_length'] = shared.args.ctx_size

    logger.info(f"Loaded \"{model_name}\" in {(time.time()-t0):.2f} seconds.")
    logger.info(f"LOADER: \"{loader}\"")
    logger.info(f"TRUNCATION LENGTH: {shared.settings['truncation_length']}")
    logger.info(f"INSTRUCTION TEMPLATE: \"{metadata['instruction_template']}\"")
    return model, tokenizer


def llama_cpp_server_loader(model_name):
    from modules.llama_cpp_server import LlamaServer

    # Сначала проверяем, является ли model_name полным путем к файлу
    path = Path(model_name)
    if path.is_file():
        model_file = path
    else:
        # Ищем модель в различных возможных директориях
        possible_paths = [
            Path(f'{shared.args.model_dir}/{model_name}'),
            Path(f'{shared.args.model_dir}/main_models/{model_name}'),
            Path(f'{shared.args.model_dir}/main_models/{model_name}/*.gguf'),
            Path(f'{shared.args.model_dir}/{model_name}/*.gguf')
        ]
        
        model_file = None
        for search_path in possible_paths:
            if search_path.is_file():
                model_file = search_path
                break
            elif search_path.is_dir():
                # Ищем .gguf файлы в директории
                gguf_files = list(search_path.glob('*.gguf'))
                if gguf_files:
                    model_file = sorted(gguf_files)[0]
                    break
            elif '*' in str(search_path):
                # Обрабатываем glob паттерны
                gguf_files = list(Path(str(search_path).split('*')[0]).glob('*.gguf'))
                if gguf_files:
                    model_file = sorted(gguf_files)[0]
                    break
        
        if model_file is None:
            raise FileNotFoundError(f"Model file not found for '{model_name}'. Searched in: {[str(p) for p in possible_paths]}")

    try:
        model = LlamaServer(model_file)
        return model, model
    except Exception as e:
        logger.error(f"Error loading the model with llama.cpp: {str(e)}")
        raise


def transformers_loader(model_name):
    from modules.transformers_loader import load_model_HF
    return load_model_HF(model_name)


def ExLlamav3_HF_loader(model_name):
    from modules.exllamav3_hf import Exllamav3HF

    return Exllamav3HF.from_pretrained(model_name)


def ExLlamav2_HF_loader(model_name):
    from modules.exllamav2_hf import Exllamav2HF

    return Exllamav2HF.from_pretrained(model_name)


def ExLlamav2_loader(model_name):
    from modules.exllamav2 import Exllamav2Model

    model, tokenizer = Exllamav2Model.from_pretrained(model_name)
    return model, tokenizer


def TensorRT_LLM_loader(model_name):
    try:
        from modules.tensorrt_llm import TensorRTLLMModel
    except ModuleNotFoundError:
        raise ModuleNotFoundError("Failed to import 'tensorrt_llm'. Please install it manually following the instructions in the TensorRT-LLM GitHub repository.")

    model = TensorRTLLMModel.from_pretrained(model_name)
    return model


def unload_model(keep_model_name=False):
    if shared.model is None:
        return

    is_llamacpp = (shared.model.__class__.__name__ == 'LlamaServer')
    if shared.model.__class__.__name__ == 'Exllamav3HF':
        shared.model.unload()

    shared.model = shared.tokenizer = None
    shared.lora_names = []
    shared.model_dirty_from_training = False

    if not is_llamacpp:
        from modules.torch_utils import clear_torch_cache
        clear_torch_cache()

    if not keep_model_name:
        shared.model_name = 'None'


def reload_model():
    unload_model()
    shared.model, shared.tokenizer = load_model(shared.model_name)


def unload_model_if_idle():
    global last_generation_time

    logger.info(f"Setting a timeout of {shared.args.idle_timeout} minutes to unload the model in case of inactivity.")

    while True:
        shared.generation_lock.acquire()
        try:
            if time.time() - last_generation_time > shared.args.idle_timeout * 60:
                if shared.model is not None:
                    logger.info("Unloading the model for inactivity.")
                    unload_model(keep_model_name=True)
        finally:
            shared.generation_lock.release()

        time.sleep(60)
