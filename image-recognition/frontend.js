document.addEventListener('DOMContentLoaded', () => {
    const processButton = document.getElementById('process-button');
    const loadingMessage = document.getElementById('loading-message');
    const resultsArea = document.getElementById('results-area');
    const extractedData = document.getElementById('extracted-data');

    const dayFiles = {};

    const setupUploadArea = (day) => {
        const uploadArea = document.getElementById(`upload-${day}`);
        const fileInput = document.getElementById(`file-${day}`);

        const handleFile = (file) => {
            if (file) {
                dayFiles[day] = file;
                const reader = new FileReader();
                reader.onload = (e) => {
                    uploadArea.style.backgroundImage = `url('${e.target.result}')`;
                    uploadArea.classList.add('has-image');
                    uploadArea.querySelector('p').style.display = 'none';
                };
                reader.readAsDataURL(file);
            }
        };

        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('hover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('hover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('hover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleFile(files[0]);
            }
        });

        uploadArea.addEventListener('click', () => {
            fileInput.click();
        });

        fileInput.addEventListener('change', (e) => {
            handleFile(e.target.files[0]);
        });
    };

    ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].forEach(setupUploadArea);

    processButton.addEventListener('click', async () => {
        if (Object.keys(dayFiles).length === 0) {
            alert('Please upload at least one image.');
            return;
        }

        loadingMessage.style.display = 'block';
        resultsArea.style.display = 'none';
        
        const formData = new FormData();
        for (const day in dayFiles) {
            formData.append(day, dayFiles[day]);
        }

        try {
            const response = await fetch('http://localhost:5000/process-schedule', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            extractedData.textContent = JSON.stringify(data, null, 2);
            loadingMessage.style.display = 'none';
            resultsArea.style.display = 'block';

        } catch (error) {
            console.error('Error processing images:', error);
            loadingMessage.style.display = 'none';
            alert('Failed to process images. Check the console for details.');
        }
    });
});