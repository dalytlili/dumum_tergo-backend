import fs from 'fs/promises';

const deletefile = async (filePath) => {
    try {
        await fs.access(filePath); // Check if file exists
        await fs.unlink(filePath); // Delete file
        console.log("File Deleted Successfully!");
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log(`File not found: ${filePath}`);
        } else if (error.code === 'EACCES') {
            console.log(`Permission denied: ${filePath}`);
        } else {
            console.log(`Error deleting file: ${error.message}`);
        }
    }
};


export { deletefile };