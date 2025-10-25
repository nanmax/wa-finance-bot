const cron = require('node-cron');
const BackupService = require('./BackupService');

class ScheduledBackupService {
    constructor(backupService, whatsappClient) {
        this.backupService = backupService;
        this.whatsappClient = whatsappClient;
        this.scheduledJobs = new Map();
        this.loadScheduledBackups();
    }

    loadScheduledBackups() {
        // Default scheduled backups
        const defaultSchedules = [
            {
                id: 'daily',
                name: 'Daily Backup',
                schedule: '0 20 * * *', // Every day at 8 PM
                enabled: true,
                targetGroup: null // Will be set by admin
            },
            {
                id: 'weekly',
                name: 'Weekly Backup',
                schedule: '0 18 * * 0', // Every Sunday at 6 PM
                enabled: true,
                targetGroup: null
            },
            {
                id: 'monthly',
                name: 'Monthly Backup',
                schedule: '0 16 1 * *', // First day of month at 4 PM
                enabled: true,
                targetGroup: null
            }
        ];

        this.schedules = defaultSchedules;
        this.startAllScheduledJobs();
    }

    startAllScheduledJobs() {
        this.schedules.forEach(schedule => {
            if (schedule.enabled && schedule.targetGroup) {
                this.startScheduledJob(schedule);
            }
        });
    }

    startScheduledJob(schedule) {
        if (this.scheduledJobs.has(schedule.id)) {
            this.scheduledJobs.get(schedule.id).stop();
        }

        const job = cron.schedule(schedule.schedule, async () => {
            console.log(`🕐 Running scheduled backup: ${schedule.name}`);
            await this.runScheduledBackup(schedule);
        });

        this.scheduledJobs.set(schedule.id, job);
        console.log(`✅ Scheduled backup started: ${schedule.name} (${schedule.schedule})`);
    }

    async runScheduledBackup(schedule) {
        try {
            console.log(`🔄 Creating scheduled backup: ${schedule.name}`);

            // Create backup
            const backupResult = await this.backupService.createBackup();
            
            if (!backupResult.success) {
                console.error(`❌ Scheduled backup failed: ${backupResult.error}`);
                return;
            }

            // Send to target group
            if (schedule.targetGroup && this.whatsappClient) {
                const message = this.generateScheduledBackupMessage(backupResult, schedule);
                
                try {
                    // Send message to group
                    await this.whatsappClient.sendMessage(schedule.targetGroup, message);
                    
                    // Send backup file with detailed caption
                    const { MessageMedia } = require('whatsapp-web.js');
                    const media = MessageMedia.fromFilePath(backupResult.filePath);
                    await this.whatsappClient.sendMessage(schedule.targetGroup, media, {
                        caption: this.generateBackupFileCaption(backupResult, schedule)
                    });

                    console.log(`✅ Scheduled backup file sent to group: ${schedule.targetGroup}`);
                } catch (error) {
                    console.error(`❌ Error sending scheduled backup to group: ${error.message}`);
                }
            }

        } catch (error) {
            console.error(`❌ Error in scheduled backup: ${error.message}`);
        }
    }

    generateScheduledBackupMessage(backupResult, schedule) {
        const metadata = backupResult.metadata;
        const timestamp = new Date().toLocaleString('id-ID');

        let message = `🕐 *SCHEDULED BACKUP - ${schedule.name.toUpperCase()}*\n\n`;
        message += `📅 *Tanggal:* ${timestamp}\n`;
        message += `📦 *File:* ${backupResult.fileName}\n\n`;
        message += `📊 *Data Summary:*\n`;
        message += `• Total Transaksi: ${metadata.totalTransactions}\n`;
        message += `• Total Pemasukan: Rp ${this.formatCurrency(metadata.totalIncome)}\n`;
        message += `• Total Pengeluaran: Rp ${this.formatCurrency(metadata.totalExpense)}\n\n`;
        message += `💡 *Tips:*\n`;
        message += `• File backup terlampir di bawah\n`;
        message += `• Simpan file untuk restore jika diperlukan\n`;
        message += `• Backup otomatis berjalan sesuai jadwal`;

        return message;
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('id-ID').format(amount);
    }

    generateBackupFileCaption(backupResult, schedule) {
        const metadata = backupResult.metadata;
        const timestamp = new Date().toLocaleString('id-ID');
        
        let caption = `📦 *BACKUP FILE - ${schedule.name.toUpperCase()}*\n\n`;
        caption += `📅 *Tanggal Backup:* ${timestamp}\n`;
        caption += `📦 *File:* ${backupResult.fileName}\n`;
        caption += `📊 *Data Summary:*\n`;
        caption += `• Total Transaksi: ${metadata.totalTransactions}\n`;
        caption += `• Total Pemasukan: Rp ${this.formatCurrency(metadata.totalIncome)}\n`;
        caption += `• Total Pengeluaran: Rp ${this.formatCurrency(metadata.totalExpense)}\n\n`;
        caption += `💡 *Cara Download:*\n`;
        caption += `• Tap file di atas untuk download\n`;
        caption += `• Simpan file untuk restore nanti\n`;
        caption += `• File berformat .zip\n\n`;
        caption += `🔄 *Cara Restore:*\n`;
        caption += `• Upload file ini ke bot\n`;
        caption += `• Ketik "restore confirm"\n`;
        caption += `• Data akan dipulihkan otomatis`;
        
        return caption;
    }

    // Admin methods
    setTargetGroup(scheduleId, groupId) {
        const schedule = this.schedules.find(s => s.id === scheduleId);
        if (schedule) {
            schedule.targetGroup = groupId;
            
            if (schedule.enabled) {
                this.startScheduledJob(schedule);
            }
            
            return { success: true, message: `Target group set for ${schedule.name}` };
        }
        return { success: false, error: 'Schedule not found' };
    }

    enableSchedule(scheduleId) {
        const schedule = this.schedules.find(s => s.id === scheduleId);
        if (schedule) {
            schedule.enabled = true;
            
            if (schedule.targetGroup) {
                this.startScheduledJob(schedule);
            }
            
            return { success: true, message: `${schedule.name} enabled` };
        }
        return { success: false, error: 'Schedule not found' };
    }

    disableSchedule(scheduleId) {
        const schedule = this.schedules.find(s => s.id === scheduleId);
        if (schedule) {
            schedule.enabled = false;
            
            const job = this.scheduledJobs.get(scheduleId);
            if (job) {
                job.stop();
                this.scheduledJobs.delete(scheduleId);
            }
            
            return { success: true, message: `${schedule.name} disabled` };
        }
        return { success: false, error: 'Schedule not found' };
    }

    getSchedules() {
        return this.schedules.map(schedule => ({
            ...schedule,
            nextRun: this.getNextRun(schedule.schedule),
            status: this.scheduledJobs.has(schedule.id) ? 'active' : 'inactive'
        }));
    }

    getNextRun(cronExpression) {
        try {
            const parser = require('cron-parser');
            const interval = parser.parseExpression(cronExpression);
            return interval.next().toDate();
        } catch (error) {
            return null;
        }
    }

    stopAllJobs() {
        this.scheduledJobs.forEach(job => job.stop());
        this.scheduledJobs.clear();
        console.log('🛑 All scheduled backup jobs stopped');
    }

    // Main start method untuk memulai service
    start() {
        console.log('🕐 Starting Scheduled Backup Service...');
        this.startAllScheduledJobs();
        console.log('✅ Scheduled Backup Service started successfully');
    }
}

module.exports = ScheduledBackupService; 