const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

class SessionErrorFixer {
    constructor() {
        this.sessionPath = './.wwebjs_auth';
        this.cachePath = './.wwebjs_cache';
    }

    // Check if file is locked
    isFileLocked(filePath) {
        try {
            // Try to open file for writing
            const fd = fs.openSync(filePath, 'r+');
            fs.closeSync(fd);
            return false;
        } catch (error) {
            return error.code === 'EBUSY' || error.code === 'EACCES';
        }
    }

    // Wait for file to be unlocked
    async waitForFileUnlock(filePath, maxWaitTime = 10000) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < maxWaitTime) {
            if (!this.isFileLocked(filePath)) {
                return true;
            }
            console.log(`⏳ Menunggu file ${path.basename(filePath)} tidak digunakan...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        return false;
    }

    // Force kill Chrome processes (Windows)
    async killChromeProcesses() {
        return new Promise((resolve) => {
            console.log('🔧 Mencoba menghentikan proses Chrome...');
            
            const command = process.platform === 'win32' 
                ? 'taskkill /f /im chrome.exe /im chromedriver.exe 2>nul || echo "No Chrome processes found"'
                : 'pkill -f chrome || echo "No Chrome processes found"';
            
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    console.log('⚠️ Tidak ada proses Chrome yang perlu dihentikan');
                } else {
                    console.log('✅ Proses Chrome berhasil dihentikan');
                }
                resolve();
            });
        });
    }

    // Safe delete file with retry
    async safeDeleteFile(filePath, maxRetries = 3) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                if (fs.existsSync(filePath)) {
                    // Wait for file to be unlocked
                    const unlocked = await this.waitForFileUnlock(filePath);
                    
                    if (unlocked) {
                        fs.unlinkSync(filePath);
                        console.log(`✅ Berhasil menghapus: ${path.basename(filePath)}`);
                        return true;
                    } else {
                        console.log(`⚠️ File masih terkunci: ${path.basename(filePath)}`);
                        
                        if (i === maxRetries - 1) {
                            // Last attempt - try to kill Chrome processes
                            await this.killChromeProcesses();
                            await new Promise(resolve => setTimeout(resolve, 2000));
                            
                            try {
                                fs.unlinkSync(filePath);
                                console.log(`✅ Berhasil menghapus setelah kill Chrome: ${path.basename(filePath)}`);
                                return true;
                            } catch (finalError) {
                                console.error(`❌ Gagal menghapus file: ${path.basename(filePath)}`);
                                return false;
                            }
                        }
                    }
                } else {
                    console.log(`ℹ️ File tidak ada: ${path.basename(filePath)}`);
                    return true;
                }
            } catch (error) {
                console.log(`⚠️ Attempt ${i + 1} gagal: ${error.message}`);
                if (i < maxRetries - 1) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
        }
        return false;
    }

    // Clear session with error handling
    async clearSession() {
        console.log('🧹 Membersihkan session WhatsApp...');
        
        try {
            // First, try to kill Chrome processes
            await this.killChromeProcesses();
            
            // Wait a bit for processes to fully terminate
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Clear session directory
            if (fs.existsSync(this.sessionPath)) {
                console.log('🗑️ Menghapus session directory...');
                
                // Try to remove the entire directory
                try {
                    fs.rmSync(this.sessionPath, { recursive: true, force: true });
                    console.log('✅ Session directory berhasil dihapus');
                } catch (error) {
                    console.log('⚠️ Gagal hapus directory, mencoba hapus file satu per satu...');
                    
                    // If directory removal fails, try to remove files individually
                    await this.removeDirectoryContents(this.sessionPath);
                }
            }
            
            // Clear cache directory
            if (fs.existsSync(this.cachePath)) {
                console.log('🗑️ Menghapus cache directory...');
                try {
                    fs.rmSync(this.cachePath, { recursive: true, force: true });
                    console.log('✅ Cache directory berhasil dihapus');
                } catch (error) {
                    console.log('⚠️ Gagal hapus cache directory, mencoba hapus file satu per satu...');
                    await this.removeDirectoryContents(this.cachePath);
                }
            }
            
            console.log('✅ Session berhasil dibersihkan');
            return true;
            
        } catch (error) {
            console.error('❌ Error membersihkan session:', error.message);
            return false;
        }
    }

    // Remove directory contents safely
    async removeDirectoryContents(dirPath) {
        try {
            const files = fs.readdirSync(dirPath);
            
            for (const file of files) {
                const filePath = path.join(dirPath, file);
                const stat = fs.statSync(filePath);
                
                if (stat.isDirectory()) {
                    await this.removeDirectoryContents(filePath);
                    try {
                        fs.rmdirSync(filePath);
                    } catch (error) {
                        console.log(`⚠️ Tidak bisa hapus directory: ${file}`);
                    }
                } else {
                    await this.safeDeleteFile(filePath);
                }
            }
        } catch (error) {
            console.log(`⚠️ Error membaca directory: ${error.message}`);
        }
    }

    // Fix session error
    async fixSessionError() {
        console.log('🔧 Memperbaiki error session WhatsApp...');
        console.log('========================================');
        
        const success = await this.clearSession();
        
        if (success) {
            console.log('\n✅ Session berhasil dibersihkan!');
            console.log('💡 Sekarang coba jalankan bot lagi:');
            console.log('   npm run dev');
        } else {
            console.log('\n❌ Gagal membersihkan session');
            console.log('💡 Coba restart komputer dan jalankan lagi');
        }
        
        return success;
    }
}

// Export for use in other files
module.exports = SessionErrorFixer;

// Run if called directly
if (require.main === module) {
    const fixer = new SessionErrorFixer();
    fixer.fixSessionError();
} 