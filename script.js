document.addEventListener('DOMContentLoaded', function() {
    const imageInput = document.getElementById('imageInput');
    const previewImage = document.getElementById('previewImage');
    const colorCount = document.getElementById('colorCount');
    const colorCountValue = document.getElementById('colorCountValue');
    const colorPalette = document.getElementById('colorPalette');
    const hexCodes = document.getElementById('hexCodes');

    let processingTimeout;
    let isProcessing = false;

    // 更新滑块值显示和处理图片
    colorCount.addEventListener('input', function() {
        colorCountValue.textContent = this.value;
        
        // 如果已经上传了图片
        if (previewImage.src !== '#') {
            processImage();
        }
    });

    // 处理图片上传
    imageInput.addEventListener('change', function(e) { 
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                previewImage.src = e.target.result;
                previewImage.style.display = 'block';
                processImage();
            }
            reader.readAsDataURL(file);
        }
    });

    // 处理图片并提取主色调
    async function processImage() {
        if (isProcessing) return;
        isProcessing = true;

        try {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.src = previewImage.src;
            
            img.onload = async function() {
                // 显示加载状态
                colorPalette.innerHTML = '<div class="loading">处理中...</div>';
                hexCodes.innerHTML = '';

                // 创建canvas获取像素数据
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // 调整canvas大小以提高性能
                const maxSize = 300;
                let width = img.width;
                let height = img.height;
                
                if (width > height && width > maxSize) {
                    height = Math.round(height * (maxSize / width));
                    width = maxSize;
                } else if (height > maxSize) {
                    width = Math.round(width * (maxSize / height));
                    height = maxSize;
                }

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const pixels = imageData.data;
                
                // 收集像素数据（每隔4个像素采样一次以提高性能）
                const colors = [];
                for (let i = 0; i < pixels.length; i += 16) {
                    colors.push([
                        pixels[i],
                        pixels[i + 1],
                        pixels[i + 2]
                    ]);
                }

                // 使用K-means聚类
                const k = parseInt(colorCount.value);
                const dominantColors = await kMeans(colors, k);
                
                // 显示结果
                displayResults(dominantColors);
            };
        } catch (error) {
            console.error('处理图片时出错:', error);
            colorPalette.innerHTML = '<div class="error">处理图片时出错</div>';
        } finally {
            isProcessing = false;
        }
    }

    // K-means聚类实现
    async function kMeans(data, k) {
        // 随机选择初始中心点
        let centers = data.sort(() => 0.5 - Math.random()).slice(0, k);
        let oldCenters = [];
        let iterations = 0;
        const maxIterations = 20;

        while (iterations < maxIterations) {
            // 分配点到最近的中心
            const clusters = Array(k).fill().map(() => []);
            
            data.forEach(point => {
                let minDist = Infinity;
                let closestCenter = 0;
                
                centers.forEach((center, i) => {
                    const dist = distance(point, center);
                    if (dist < minDist) {
                        minDist = dist;
                        closestCenter = i;
                    }
                });
                
                clusters[closestCenter].push(point);
            });

            // 更新中心点
            oldCenters = [...centers];
            centers = clusters.map(cluster => {
                if (cluster.length === 0) return oldCenters[0];
                return cluster.reduce((acc, point) => {
                    return [
                        acc[0] + point[0]/cluster.length,
                        acc[1] + point[1]/cluster.length,
                        acc[2] + point[2]/cluster.length
                    ];
                }, [0, 0, 0]);
            });

            iterations++;
        }

        return centers.map(center => center.map(Math.round));
    }

    // 计算两点之间的欧氏距离
    function distance(p1, p2) {
        return Math.sqrt(
            Math.pow(p1[0] - p2[0], 2) +
            Math.pow(p1[1] - p2[1], 2) +
            Math.pow(p1[2] - p2[2], 2)
        );
    }

    // 更新显示结果函数
    function displayResults(colors) {
        // 清空之前的结果
        colorPalette.innerHTML = '';
        hexCodes.innerHTML = '';

        // 按颜色的亮度排序
        colors.sort((a, b) => {
            const brightnessA = (a[0] * 299 + a[1] * 587 + a[2] * 114) / 1000;
            const brightnessB = (b[0] * 299 + b[1] * 587 + b[2] * 114) / 1000;
            return brightnessB - brightnessA;
        });

        // 显示色块和十六进制代码
        colors.forEach(color => {
            const colorBox = document.createElement('div');
            colorBox.className = 'color-box';
            colorBox.style.backgroundColor = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
            colorPalette.appendChild(colorBox);

            const hexCode = `#${color[0].toString(16).padStart(2, '0')}${color[1].toString(16).padStart(2, '0')}${color[2].toString(16).padStart(2, '0')}`;
            const hexText = document.createElement('div');
            hexText.textContent = hexCode.toUpperCase();
            hexCodes.appendChild(hexText);
        });
    }
}); 