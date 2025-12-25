export const createPhotoUtils = (bot) => {
    // Helper function to download photo and convert to base64
    const downloadPhotoAsBase64 = async (fileId) => {
        try {
            const file = await bot.getFile(fileId);
            const fileStream = await bot.downloadFile(file.file_id);
            
            // Convert buffer to base64
            const base64 = fileStream.toString('base64');
            const fileName = file.file_path?.split('/').pop() || `photo_${fileId}.jpg`;
            
            return { name: fileName, base64 };
        } catch (error) {
            console.error('Error downloading photo:', error);
            throw error;
        }
    };

    return {
        downloadPhotoAsBase64
    };
};

