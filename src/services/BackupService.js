const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const extract = require('extract-zip');
const Database = require('../database/Database');

class BackupService {
    constructor(database) {
        this.database = database;
        this.backupDir = path.join(__dirname, '..', '..', 'backups');
        this.ensureBackupDirectory();
    }

    ensureBackupDirectory() {
        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
        }
    }

    async createBackup() {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupFileName = `finance-backup-${timestamp}.zip`;
            const backupPath = path.join(this.backupDir, backupFileName);

            // Get all data from database
            const transactions = await this.database.getTransactions();
            const config = await this.database.loadConfig();

            // Create backup data
            const backupData = {
                version: '1.0.0',
                timestamp: new Date().toISOString(),
                transactions: transactions,
                config: config,
                metadata: {
                    totalTransactions: transactions.length,
                    totalIncome: transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
                    totalExpense: transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
                    backupType: 'manual'
                }
            };

            // Create zip file
            const output = fs.createWriteStream(backupPath);
            const archive = archiver('zip', { zlib: { level: 9 } });

            output.on('close', () => {
                console.log(`✅ Backup created: ${backupPath}`);
                console.log(`📊 Archive size: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`);
            });

            archive.on('error', (err) => {
                throw err;
            });

            archive.pipe(output);
            archive.append(JSON.stringify(backupData, null, 2), { name: 'backup-data.json' });

            await archive.finalize();

            return {
                success: true,
                filePath: backupPath,
                fileName: backupFileName,
                metadata: backupData.metadata
            };

        } catch (error) {
            console.error('❌ Error creating backup:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async restoreFromFile(filePath) {
        try {
            console.log(`🔄 Starting restore from: ${filePath}`);

            // Extract zip file
            const extractDir = path.join(this.backupDir, 'temp-restore');
            if (fs.existsSync(extractDir)) {
                fs.rmSync(extractDir, { recursive: true });
            }
            fs.mkdirSync(extractDir, { recursive: true });

            await extract(filePath, { dir: extractDir });

            // Read backup data
            const backupDataPath = path.join(extractDir, 'backup-data.json');
            if (!fs.existsSync(backupDataPath)) {
                throw new Error('Invalid backup file: backup-data.json not found');
            }

            const backupData = JSON.parse(fs.readFileSync(backupDataPath, 'utf8'));

            // Validate backup data
            if (!backupData.transactions || !Array.isArray(backupData.transactions)) {
                throw new Error('Invalid backup file: transactions data not found');
            }

            // Clear existing data
            await this.database.clearAllData();

            // Restore transactions
            let restoredCount = 0;
            for (const transaction of backupData.transactions) {
                await this.database.saveTransaction(transaction);
                restoredCount++;
            }

            // Restore config if exists
            if (backupData.config) {
                await this.database.saveConfig(backupData.config);
            }

            // Cleanup
            fs.rmSync(extractDir, { recursive: true });

            return {
                success: true,
                restoredTransactions: restoredCount,
                metadata: backupData.metadata,
                backupTimestamp: backupData.timestamp
            };

        } catch (error) {
            console.error('❌ Error restoring backup:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async getBackupList() {
        try {
            const files = fs.readdirSync(this.backupDir);
            const backupFiles = files.filter(file => file.endsWith('.zip'));

            const backupList = [];
            for (const file of backupFiles) {
                const filePath = path.join(this.backupDir, file);
                const stats = fs.statSync(filePath);
                
                backupList.push({
                    fileName: file,
                    filePath: filePath,
                    size: stats.size,
                    created: stats.birthtime,
                    sizeFormatted: this.formatFileSize(stats.size)
                });
            }

            return backupList.sort((a, b) => b.created - a.created);

        } catch (error) {
            console.error('❌ Error getting backup list:', error);
            return [];
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async deleteBackup(fileName) {
        try {
            const filePath = path.join(this.backupDir, fileName);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                return { success: true };
            } else {
                return { success: false, error: 'File not found' };
            }
        } catch (error) {
            console.error('❌ Error deleting backup:', error);
            return { success: false, error: error.message };
        }
    }

    async validateBackupFile(filePath) {
        try {
            const extractDir = path.join(this.backupDir, 'temp-validate');
            if (fs.existsSync(extractDir)) {
                fs.rmSync(extractDir, { recursive: true });
            }
            fs.mkdirSync(extractDir, { recursive: true });

            await extract(filePath, { dir: extractDir });

            const backupDataPath = path.join(extractDir, 'backup-data.json');
            if (!fs.existsSync(backupDataPath)) {
                fs.rmSync(extractDir, { recursive: true });
                return { valid: false, error: 'Invalid backup file structure' };
            }

            const backupData = JSON.parse(fs.readFileSync(backupDataPath, 'utf8'));

            // Cleanup
            fs.rmSync(extractDir, { recursive: true });

            return {
                valid: true,
                metadata: backupData.metadata,
                timestamp: backupData.timestamp,
                transactionCount: backupData.transactions.length
            };

        } catch (error) {
            console.error('❌ Error validating backup file:', error);
            return { valid: false, error: error.message };
        }
    }
}

module.exports = BackupService; 