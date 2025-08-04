const fs = require('fs');
const path = require('path');

class SessionFixer {
    constructor() {
        this.authPath = process.env.AUTH_PATH || './.wwebjs_auth';
        this.clientId = process.env.CLIENT_ID || 'wa-finance-render';
        this.sessionPath = path.join(this.authPath, `session-${this.clientId}`);
    }

    async forceCleanup() {
        console.log('🔧 Memulai pembersihan session yang dipaksa...');
        
        try {
            // Tunggu sebentar untuk memastikan semua proses selesai
            await this.delay(2000);
            
            if (fs.existsSync(this.sessionPath)) {
                console.log(`📁 Session path ditemukan: ${this.sessionPath}`);
                
                // Coba hapus file yang bermasalah dengan retry
                const problematicFiles = [
                    'Default/Cookies-journal',
                    'Default/Cookies',
                    'Default/Web Data-journal',
                    'Default/Web Data',
                    'Default/Network Persistent State',
                    'Default/Network Action Predictor',
                    'Default/QuotaManager',
                    'Default/QuotaManager-journal'
                ];
                
                for (const file of problematicFiles) {
                    await this.safeDeleteFile(file);
                }
                
                // Coba hapus seluruh folder Default jika masih ada masalah
                const defaultPath = path.join(this.sessionPath, 'Default');
                if (fs.existsSync(defaultPath)) {
                    try {
                        await this.recursiveDelete(defaultPath);
                        console.log('✅ Berhasil menghapus folder Default');
                    } catch (error) {
                        console.log(`⚠️ Tidak bisa menghapus folder Default: ${error.message}`);
                    }
                }
                
                // Coba hapus seluruh session folder jika masih bermasalah
                try {
                    await this.recursiveDelete(this.sessionPath);
                    console.log('✅ Berhasil menghapus seluruh session folder');
                } catch (error) {
                    console.log(`⚠️ Tidak bisa menghapus session folder: ${error.message}`);
                }
            } else {
                console.log('📁 Session path tidak ditemukan, tidak perlu cleanup');
            }
            
        } catch (error) {
            console.error('❌ Error dalam force cleanup:', error.message);
        }
    }

    async safeDeleteFile(relativePath) {
        const filePath = path.join(this.sessionPath, relativePath);
        
        if (fs.existsSync(filePath)) {
            try {
                // Coba hapus dengan retry
                for (let i = 0; i < 3; i++) {
                    try {
                        fs.unlinkSync(filePath);
                        console.log(`✅ Berhasil menghapus: ${relativePath}`);
                        return;
                    } catch (error) {
                        if (i < 2) {
                            console.log(`⏳ Retry ${i + 1}/3 untuk ${relativePath}...`);
                            await this.delay(1000);
                        } else {
                            console.log(`⚠️ Gagal menghapus ${relativePath}: ${error.message}`);
                        }
                    }
                }
            } catch (error) {
                console.log(`⚠️ Error menghapus ${relativePath}: ${error.message}`);
            }
        }
    }

    async recursiveDelete(dirPath) {
        if (fs.existsSync(dirPath)) {
            const files = fs.readdirSync(dirPath);
            
            for (const file of files) {
                const curPath = path.join(dirPath, file);
                
                if (fs.lstatSync(curPath).isDirectory()) {
                    await this.recursiveDelete(curPath);
                } else {
                    try {
                        fs.unlinkSync(curPath);
                    } catch (error) {
                        console.log(`⚠️ Tidak bisa menghapus file: ${curPath}`);
                    }
                }
            }
            
            try {
                fs.rmdirSync(dirPath);
            } catch (error) {
                console.log(`⚠️ Tidak bisa menghapus directory: ${dirPath}`);
            }
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async createBackup() {
        const backupPath = `./backups/session-backup-${new Date().toISOString().replace(/[:.]/g, '-')}`;
        
        try {
            if (fs.existsSync(this.sessionPath)) {
                if (!fs.existsSync('./backups')) {
                    fs.mkdirSync('./backups', { recursive: true });
                }
                
                // Copy session folder ke backup
                await this.copyDirectory(this.sessionPath, backupPath);
                console.log(`✅ Backup session dibuat di: ${backupPath}`);
            }
        } catch (error) {
            console.log(`⚠️ Gagal membuat backup: ${error.message}`);
        }
    }

    async copyDirectory(src, dest) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }
        
        const files = fs.readdirSync(src);
        
        for (const file of files) {
            const srcPath = path.join(src, file);
            const destPath = path.join(dest, file);
            
            if (fs.lstatSync(srcPath).isDirectory()) {
                await this.copyDirectory(srcPath, destPath);
            } else {
                try {
                    fs.copyFileSync(srcPath, destPath);
                } catch (error) {
                    console.log(`⚠️ Tidak bisa copy file: ${srcPath}`);
                }
            }
        }
    }
}

// Jalankan fixer
async function main() {
    console.log('🚀 Memulai perbaikan session error...');
    
    const fixer = new SessionFixer();
    
    // Buat backup terlebih dahulu
    await fixer.createBackup();
    
    // Lakukan force cleanup
    await fixer.forceCleanup();
    
    console.log('✅ Proses perbaikan session selesai!');
    console.log('💡 Tips:');
    console.log('   - Restart aplikasi dengan: npm run start:finance');
    console.log('   - Jika masih error, coba matikan semua proses Node.js terlebih dahulu');
    console.log('   - Pastikan tidak ada aplikasi lain yang menggunakan session yang sama');
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = SessionFixer; 