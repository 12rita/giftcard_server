export const createPhotoUtils = (bot) => {
    // Helper function to download photo and convert to base64
    const downloadPhotoAsBase64 = async (fileId) => {
        try {
            // Small delay to ensure Telegram has processed the file
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Get file info first to get file_path
            const file = await bot.getFile(fileId);
            
            if (!file.file_path) {
                throw new Error(`File path not available for file_id: ${fileId}`);
            }

            // Use bot.getFileLink to get the download URL (more reliable than constructing manually)
            const fileUrl = await bot.getFileLink(file.file_id || fileId);
            
            // Download using fetch
            const response = await fetch(fileUrl);
            if (!response.ok) {
                throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
            }
            
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const base64String = buffer.toString('base64');
            const fileName = file.file_path.split('/').pop() || `photo_${fileId.substring(0, 20)}.jpg`;
            
            // Determine MIME type from file extension
            const getMimeType = (filename) => {
                const ext = filename.toLowerCase().split('.').pop();
                const mimeTypes = {
                    'jpg': 'image/jpeg',
                    'jpeg': 'image/jpeg',
                    'png': 'image/png',
                    'gif': 'image/gif',
                    'webp': 'image/webp'
                };
                return mimeTypes[ext] || 'image/jpeg'; // default to jpeg
            };
            
            const mimeType = getMimeType(fileName);
            // Format as data URI: data:image/jpeg;base64,<base64string>
            const base64 = `data:${mimeType};base64,${base64String}`;
            
            return { name: fileName, base64 };
        } catch (error) {
            console.error(`Error downloading photo ${fileId}:`, error);
            // Re-throw with more context
            throw new Error(`Failed to download photo ${fileId}: ${error.message}`);
        }
    };

    return {
        downloadPhotoAsBase64
    };
};


