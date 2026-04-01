@echo off
echo === Раскладываем файлы по папкам ===

mkdir weights\wan_i2v
mkdir weights\loras

echo Перемещаем основную модель...
move "Wan2_1-I2V-14B-480P_fp8_e4m3fn.safetensors" weights\wan_i2v\

echo Перемещаем VAE...
move "Wan2.1_VAE.pth" weights\wan_i2v\

echo Перемещаем CLIP Image Encoder...
move "models_clip_open-clip-xlm-roberta-large-vit-huge-14.pth" weights\wan_i2v\

echo Перемещаем T5 Text Encoder...
move "models_t5_umt5-xxl-enc-bf16.pth" weights\wan_i2v\

echo Перемещаем LoRA...
move weights\Wan2.1_T2V_14B_FusionX_LoRA.safetensors weights\loras\

echo.
echo === Готово! Итоговая структура: ===
tree weights /F
pause
