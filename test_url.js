const API_CONFIG = {
    CDN_URL: 'https://static.candygirlschat.com'
};

const getMediaUrl = (path) => {
    if (!path) return '';

    let clearPath = path;

    if (path.startsWith('http://') || path.startsWith('https://')) {
        if (path.includes('/media/')) {
            const parts = path.split('/media/');
            clearPath = parts[parts.length - 1] || path;
        }
        else if (path.includes('.storage.yandexcloud.net/')) {
            const parts = path.split('.storage.yandexcloud.net/');
            clearPath = parts[parts.length - 1] || path;
        } else if (path.includes('storage.yandexcloud.net/')) {
            const parts = path.split('storage.yandexcloud.net/')[1].split('/');
            if (parts.length > 1) {
                clearPath = parts.slice(1).join('/');
            }
        } else {
            return path;
        }
    }

    const finalPath = clearPath.replace(/^\/?(media\/)?/, '');

    const baseUrl = API_CONFIG.CDN_URL || '/media';
    return `${baseUrl}/${finalPath}`;
};

console.log(getMediaUrl('https://storage.yandexcloud.net/jfpohpdofnhd/generated/55360378f98a45a0aebd88cc0a948f74.webp'));
console.log(getMediaUrl('https://cherrylust.art/media/generated/406356a.webp'));
